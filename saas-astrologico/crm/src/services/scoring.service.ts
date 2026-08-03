// ─── Servicio de Lead Scoring ─────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
import { SCORING_CONFIG, TipoAccion } from '../types';

const prisma = new PrismaClient();

/**
 * Calcula los puntos que corresponden a una acción determinada.
 */
export function puntosDeAccion(tipo: TipoAccion, contexto?: Record<string, number>): number {
  switch (tipo) {
    case 'email_abierto':
      return SCORING_CONFIG.emailsAbiertos5;   // +20 cada 5 abiertos (se controla externamente)
    case 'click_link':
      return SCORING_CONFIG.clickEnlaceVenta;
    case 'visita_landing':
      return SCORING_CONFIG.visitaLanding;
    case 'respuesta':
      return SCORING_CONFIG.respuestaRecibida;
    case 'trial_iniciado':
      return SCORING_CONFIG.trialIniciado;
    case 'compra':
      return SCORING_CONFIG.compra;
    case 'email_enviado':
      return 0;
    default:
      return SCORING_CONFIG.interaccion;
  }
}

/**
 * Registra una acción sobre un contacto y actualiza su lead score.
 */
export async function registrarAccion(
  contactoId: string,
  tipo: TipoAccion,
  descripcion?: string
): Promise<{ nuevoScore: number; puntosAplicados: number }> {
  const contacto = await prisma.contacto.findUnique({
    where: { id: contactoId },
    select: { leadScore: true, emailsAbiertos: true, emailsEnviados: true },
  });

  if (!contacto) throw new Error(`Contacto ${contactoId} no encontrado`);

  let puntos = puntosDeAccion(tipo);

  // Lógica especial: bonus de apertura cada 5 abiertos
  if (tipo === 'email_abierto') {
    const nuevosAbiertos = contacto.emailsAbiertos + 1;
    puntos = nuevosAbiertos % 5 === 0 ? SCORING_CONFIG.emailsAbiertos5 : 0;
  }

  const nuevoScore = Math.min(
    Math.max(0, contacto.leadScore + puntos),
    SCORING_CONFIG.MAX_SCORE
  );

  // Actualizar en paralelo: acción + score + contadores
  await prisma.$transaction([
    prisma.accion.create({
      data: { contactoId, tipo, descripcion, puntosAplicados: puntos },
    }),
    prisma.contacto.update({
      where: { id: contactoId },
      data: {
        leadScore: nuevoScore,
        interacciones: { increment: 1 },
        ultimaInteraccion: new Date(),
        ...(tipo === 'email_abierto' ? { emailsAbiertos: { increment: 1 } } : {}),
        ...(tipo === 'email_enviado' ? { emailsEnviados: { increment: 1 } } : {}),
      },
    }),
  ]);

  return { nuevoScore, puntosAplicados: puntos };
}

/**
 * Recalcula el score de un contacto aplicando penalización por inactividad de email.
 */
export async function aplicarPenalizacionInactividad(contactoId: string): Promise<number> {
  const contacto = await prisma.contacto.findUnique({
    where: { id: contactoId },
    select: { leadScore: true, emailsEnviados: true, emailsAbiertos: true },
  });

  if (!contacto) throw new Error(`Contacto ${contactoId} no encontrado`);

  const sinAbrir = contacto.emailsEnviados - contacto.emailsAbiertos;
  if (sinAbrir < 10) return contacto.leadScore;

  const penalizacion = Math.floor(sinAbrir / 10) * Math.abs(SCORING_CONFIG.emailsSinAbrir10);
  const nuevoScore = Math.max(0, contacto.leadScore - penalizacion);

  await prisma.contacto.update({
    where: { id: contactoId },
    data: { leadScore: nuevoScore },
  });

  return nuevoScore;
}

/**
 * Determina la etiqueta de temperatura del lead según su score.
 */
export function etiquetaDeScore(score: number): string {
  if (score >= 70) return 'caliente';
  if (score >= 40) return 'tibio';
  if (score >= 15) return 'frio';
  return 'sin_actividad';
}
