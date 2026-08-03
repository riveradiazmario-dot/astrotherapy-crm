// ─── Servicio de Oportunidades (Pipeline) ────────────────────────────────────
import { PrismaClient, Oportunidad } from '@prisma/client';

const prisma = new PrismaClient();

export type EtapaPipeline =
  | 'prospecto'
  | 'contactado'
  | 'propuesta'
  | 'negociacion'
  | 'cerrado_ganado'
  | 'cerrado_perdido';

export const ETAPAS_ORDEN: EtapaPipeline[] = [
  'prospecto',
  'contactado',
  'propuesta',
  'negociacion',
  'cerrado_ganado',
  'cerrado_perdido',
];

export const ETAPAS_INFO: Record<EtapaPipeline, { label: string; color: string; probabilidadDefault: number }> = {
  prospecto:        { label: 'Prospecto',        color: '#7b7b9a', probabilidadDefault: 10 },
  contactado:       { label: 'Contactado',        color: '#6B5BCC', probabilidadDefault: 25 },
  propuesta:        { label: 'Propuesta enviada', color: '#f4a261', probabilidadDefault: 50 },
  negociacion:      { label: 'En negociación',    color: '#2EC4B6', probabilidadDefault: 75 },
  cerrado_ganado:   { label: 'Cerrado ✓',         color: '#2dc653', probabilidadDefault: 100 },
  cerrado_perdido:  { label: 'Perdido ✗',         color: '#e63946', probabilidadDefault: 0 },
};

export interface CrearOportunidadDTO {
  titulo: string;
  descripcion?: string;
  etapa?: EtapaPipeline;
  valor?: number;
  probabilidad?: number;
  fechaCierre?: string;
  contactoId?: string;
  responsableId?: string;
  notas?: string;
}

export interface ActualizarOportunidadDTO extends Partial<CrearOportunidadDTO> {
  motivoPerdida?: string;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function crearOportunidad(
  dto: CrearOportunidadDTO,
  organizacionId: string,
): Promise<Oportunidad> {
  const etapa = dto.etapa ?? 'prospecto';
  return prisma.oportunidad.create({
    data: {
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      etapa,
      valor: dto.valor ?? 0,
      probabilidad: dto.probabilidad ?? ETAPAS_INFO[etapa].probabilidadDefault,
      fechaCierre: dto.fechaCierre ? new Date(dto.fechaCierre) : undefined,
      contactoId: dto.contactoId || undefined,
      responsableId: dto.responsableId || undefined,
      notas: dto.notas,
      organizacionId,
    },
    include: { contacto: { select: { id: true, nombre: true, email: true } } },
  });
}

export async function obtenerOportunidad(
  id: string,
  organizacionId: string,
): Promise<Oportunidad> {
  const op = await prisma.oportunidad.findFirst({
    where: { id, organizacionId },
    include: { contacto: { select: { id: true, nombre: true, email: true } } },
  });
  if (!op) throw new Error(`Oportunidad ${id} no encontrada`);
  return op;
}

export async function listarOportunidades(organizacionId: string): Promise<{
  porEtapa: Record<EtapaPipeline, Oportunidad[]>;
  totales: Record<EtapaPipeline, { cantidad: number; valorTotal: number }>;
  resumen: { totalDeals: number; valorPipeline: number; valorGanado: number };
}> {
  const todas = await prisma.oportunidad.findMany({
    where: { organizacionId },
    include: { contacto: { select: { id: true, nombre: true, email: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  const porEtapa = {} as Record<EtapaPipeline, Oportunidad[]>;
  const totales = {} as Record<EtapaPipeline, { cantidad: number; valorTotal: number }>;

  for (const etapa of ETAPAS_ORDEN) {
    const lista = todas.filter(o => o.etapa === etapa);
    porEtapa[etapa] = lista;
    totales[etapa] = {
      cantidad: lista.length,
      valorTotal: lista.reduce((s, o) => s + (o.valor ?? 0), 0),
    };
  }

  const activas = todas.filter(o => o.etapa !== 'cerrado_ganado' && o.etapa !== 'cerrado_perdido');

  return {
    porEtapa,
    totales,
    resumen: {
      totalDeals: todas.length,
      valorPipeline: activas.reduce((s, o) => s + (o.valor ?? 0), 0),
      valorGanado: totales.cerrado_ganado.valorTotal,
    },
  };
}

export async function moverEtapa(
  id: string,
  etapa: EtapaPipeline,
  organizacionId: string,
  motivoPerdida?: string,
): Promise<Oportunidad> {
  await obtenerOportunidad(id, organizacionId);
  return prisma.oportunidad.update({
    where: { id },
    data: {
      etapa,
      probabilidad: ETAPAS_INFO[etapa].probabilidadDefault,
      motivoPerdida: etapa === 'cerrado_perdido' ? (motivoPerdida ?? null) : null,
    },
    include: { contacto: { select: { id: true, nombre: true, email: true } } },
  });
}

export async function actualizarOportunidad(
  id: string,
  dto: ActualizarOportunidadDTO,
  organizacionId: string,
): Promise<Oportunidad> {
  await obtenerOportunidad(id, organizacionId);
  return prisma.oportunidad.update({
    where: { id },
    data: {
      ...dto,
      fechaCierre: dto.fechaCierre ? new Date(dto.fechaCierre) : undefined,
      contactoId: dto.contactoId || undefined,
    },
    include: { contacto: { select: { id: true, nombre: true, email: true } } },
  });
}

export async function eliminarOportunidad(
  id: string,
  organizacionId: string,
): Promise<void> {
  await obtenerOportunidad(id, organizacionId);
  await prisma.oportunidad.delete({ where: { id } });
}
