// ─── Lead Routing — Asignar automáticamente a agentes según especialidad ───────

import { PrismaClient, Contacto } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeo de especialidad a agente preferido
// En producción, esto vendría de configuración por organización
const ESPECIALIDAD_AGENTE: Record<string, string> = {
  'astrologia_tropical': 'mario',      // Mario Rivera
  'astrologia_vedica': 'mario',
  'tarot': 'mario',
  'constelaciones_familiares': 'mario',
  'reiki': 'america',                  // América Arroyo
  'biodescodificacion': 'america',
  'coaching_holistico': 'mario',
  'numerologia': 'mario',
};

/**
 * Asignar contacto automáticamente según especialidad
 */
export async function asignarContactoAutomatico(
  contacto: Contacto,
  organizacionId: string,
): Promise<{ asignado: boolean; agente?: string; notas?: string }> {
  try {
    const especialidad = contacto.especialidadPrimaria;
    const agenteRecomendado = ESPECIALIDAD_AGENTE[especialidad];

    if (!agenteRecomendado) {
      return {
        asignado: false,
        notas: `No hay agente asignado para especialidad: ${especialidad}`,
      };
    }

    // En una implementación completa, buscarías el usuario en la BD
    // Por ahora, solo registramos la recomendación en notas
    const notasActuales = contacto.notas || '';
    const notasActualizadas = `${notasActuales}\n\n[ROUTING] Recomendado: ${agenteRecomendado}`.trim();

    await prisma.contacto.update({
      where: { id: contacto.id },
      data: {
        notas: notasActualizadas,
      },
    });

    return {
      asignado: true,
      agente: agenteRecomendado,
      notas: `Lead asignado automáticamente a ${agenteRecomendado}`,
    };
  } catch (err) {
    console.error('Error en lead routing:', err);
    return { asignado: false, notas: 'Error en asignación automática' };
  }
}

/**
 * Obtener estadísticas de asignación
 */
export async function obtenerEstadisticasAsignacion(
  organizacionId: string,
): Promise<Record<string, number>> {
  const contactos = await prisma.contacto.findMany({
    where: { organizacionId },
    select: { especialidadPrimaria: true },
  });

  const stats: Record<string, number> = {};
  for (const c of contactos) {
    const especialidad = c.especialidadPrimaria || 'otro';
    stats[especialidad] = (stats[especialidad] || 0) + 1;
  }

  return stats;
}
