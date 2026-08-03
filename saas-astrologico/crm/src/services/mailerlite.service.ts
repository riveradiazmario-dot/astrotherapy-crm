// ─── Servicio de integración con MailerLite ───────────────────────────────────
import axios from 'axios';
import { PrismaClient, Contacto } from '@prisma/client';

const prisma = new PrismaClient();

const ML_BASE = 'https://connect.mailerlite.com/api';

function mlHeaders() {
  const key = process.env.MAILERLITE_API_KEY;
  if (!key) throw new Error('MAILERLITE_API_KEY no configurada en .env');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

// ─── Grupos de MailerLite (desde .env) ────────────────────────────────────────
function grupoParaContacto(contacto: Contacto): string | undefined {
  if (contacto.estado === 'cliente') return process.env.MAILERLITE_GROUP_CLIENTES;
  if (contacto.etiquetas.includes('early_adopter')) return process.env.MAILERLITE_GROUP_EARLY_ADOPTERS;
  if (['astrologia_tropical', 'astrologia_vedica', 'astrogenealogia'].includes(contacto.especialidadPrimaria)) {
    return process.env.MAILERLITE_GROUP_ASTROLOGOS;
  }
  return process.env.MAILERLITE_GROUP_TERAPEUTAS;
}

// ─── Sincronizar un contacto a MailerLite ─────────────────────────────────────
export async function sincronizarContacto(
  contacto: Contacto
): Promise<{ mlId: string; accion: 'creado' | 'actualizado' }> {
  if (!contacto.consentimientoEmail) {
    throw new Error(`El contacto ${contacto.email} no tiene consentimiento de email`);
  }

  const grupoId = grupoParaContacto(contacto);
  const etiquetas = JSON.parse(contacto.etiquetas || '[]') as string[];

  const payload = {
    email: contacto.email,
    fields: {
      name: contacto.nombre ?? '',
      last_name: '',
      phone: contacto.telefono ?? '',
      especialidad: contacto.especialidadPrimaria,
      nivel_experiencia: contacto.nivelExperiencia,
      pais: contacto.pais,
      lead_score: String(contacto.leadScore),
      fuente: contacto.fuente,
    },
    groups: grupoId ? [grupoId] : [],
    status: 'active',
  };

  let response;
  let accion: 'creado' | 'actualizado' = 'creado';

  if (contacto.mailerliteId) {
    // Actualizar suscriptor existente
    response = await axios.put(
      `${ML_BASE}/subscribers/${contacto.mailerliteId}`,
      payload,
      { headers: mlHeaders() }
    );
    accion = 'actualizado';
  } else {
    // Crear nuevo suscriptor
    response = await axios.post(`${ML_BASE}/subscribers`, payload, {
      headers: mlHeaders(),
    });
  }

  const mlId: string = response.data?.data?.id ?? contacto.mailerliteId ?? '';

  // Actualizar mailerliteId en nuestra BD
  await prisma.contacto.update({
    where: { id: contacto.id },
    data: { mailerliteId: mlId, mailerliteSyncedAt: new Date() },
  });

  return { mlId, accion };
}

// ─── Sincronizar todos los contactos con consentimiento ───────────────────────
export async function sincronizarTodos(): Promise<{
  total: number;
  exitosos: number;
  errores: number;
  detalles: string[];
}> {
  const contactos = await prisma.contacto.findMany({
    where: { consentimientoEmail: true },
  });

  let exitosos = 0;
  let errores = 0;
  const detalles: string[] = [];

  for (const contacto of contactos) {
    try {
      const { accion } = await sincronizarContacto(contacto);
      exitosos++;
      detalles.push(`${contacto.email} → ${accion}`);
    } catch (err) {
      errores++;
      detalles.push(`ERROR ${contacto.email}: ${(err as Error).message}`);
    }
    // Rate limiting: pausa de 200ms entre llamadas
    await new Promise((r) => setTimeout(r, 200));
  }

  return { total: contactos.length, exitosos, errores, detalles };
}

// ─── Obtener estadísticas de campañas desde MailerLite ────────────────────────
export async function obtenerEstadisticasCampanas(): Promise<unknown> {
  const response = await axios.get(`${ML_BASE}/campaigns?filter[status]=sent&limit=20`, {
    headers: mlHeaders(),
  });
  return response.data;
}

// ─── Listar grupos de MailerLite ─────────────────────────────────────────────
export async function listarGrupos(): Promise<unknown> {
  const response = await axios.get(`${ML_BASE}/groups`, {
    headers: mlHeaders(),
  });
  return response.data;
}

// ─── Sincronizar stats de email de vuelta al CRM ──────────────────────────────
export async function sincronizarStatsEmail(mailerliteId: string): Promise<void> {
  const response = await axios.get(`${ML_BASE}/subscribers/${mailerliteId}`, {
    headers: mlHeaders(),
  });

  const stats = response.data?.data?.stats ?? {};

  await prisma.contacto.updateMany({
    where: { mailerliteId },
    data: {
      emailsEnviados: stats.sent ?? 0,
      emailsAbiertos: stats.opens_count ?? 0,
      emailsClicados: stats.click_rate ?? 0,
    },
  });
}
