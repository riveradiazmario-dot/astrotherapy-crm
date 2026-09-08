// ─── Servicio de Secuencias ───────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function crearSecuencia(
  nombre: string,
  descripcion: string | null,
  tipo: string = 'bienvenida',
  organizacionId = 'org-luz-holistica',
) {
  return prisma.secuencia.create({
    data: {
      nombre,
      descripcion,
      tipo,
      organizacionId,
    },
  });
}

export async function crearPaso(
  secuenciaId: string,
  orden: number,
  tipo: string,
  config: Record<string, unknown>,
  condicion_skip?: Record<string, unknown>,
) {
  return prisma.secuenciaPaso.create({
    data: {
      secuenciaId,
      orden,
      tipo,
      config: config as any,
      condicion_skip: condicion_skip ? (condicion_skip as any) : null,
    },
  });
}

export async function listarSecuencias(organizacionId = 'org-luz-holistica') {
  return prisma.secuencia.findMany({
    where: { organizacionId },
    include: {
      pasos: { orderBy: { orden: 'asc' } },
      _count: { select: { automatizaciones: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function obtenerSecuencia(id: string) {
  return prisma.secuencia.findUnique({
    where: { id },
    include: {
      pasos: { orderBy: { orden: 'asc' } },
    },
  });
}

export async function actualizarSecuencia(
  id: string,
  updates: { nombre?: string; descripcion?: string; activo?: boolean },
) {
  return prisma.secuencia.update({
    where: { id },
    data: updates,
    include: { pasos: { orderBy: { orden: 'asc' } } },
  });
}

export async function eliminarSecuencia(id: string) {
  return prisma.secuencia.delete({
    where: { id },
  });
}

export async function actualizarPaso(
  pasoId: string,
  updates: Record<string, unknown>,
) {
  return prisma.secuenciaPaso.update({
    where: { id: pasoId },
    data: updates as any,
  });
}

export async function eliminarPaso(pasoId: string) {
  return prisma.secuenciaPaso.delete({
    where: { id: pasoId },
  });
}
