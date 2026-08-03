// ─── Servicio de Contactos (multi-tenant) ────────────────────────────────────
import { PrismaClient, Contacto } from '@prisma/client';
import {
  CrearContactoDTO,
  ActualizarContactoDTO,
  FiltrosContacto,
  PaginatedResponse,
  SCORING_CONFIG,
} from '../types';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializarArray(arr?: string[]): string {
  return JSON.stringify(arr ?? []);
}

function deserializarArray(str: string): string[] {
  try { return JSON.parse(str); } catch { return []; }
}

function calcularScoreInicial(dto: CrearContactoDTO): number {
  let score = SCORING_CONFIG.capturaInicial;
  if (dto.email) score += SCORING_CONFIG.emailVisible;
  if (dto.especialidadPrimaria && dto.especialidadPrimaria !== 'otro') {
    score += SCORING_CONFIG.especialidadConfirmada;
  }
  return Math.min(score, SCORING_CONFIG.MAX_SCORE);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function crearContacto(
  dto: CrearContactoDTO,
  organizacionId: string,
): Promise<Contacto> {
  const existente = await prisma.contacto.findFirst({
    where: { email: dto.email.toLowerCase().trim(), organizacionId },
  });
  if (existente) throw new Error(`Ya existe un contacto con el email: ${dto.email}`);

  const scoreInicial = calcularScoreInicial(dto);

  return prisma.contacto.create({
    data: {
      ...dto,
      email: dto.email.toLowerCase().trim(),
      certificaciones: serializarArray(dto.certificaciones),
      etiquetas: serializarArray(dto.etiquetas),
      leadScore: scoreInicial,
      fechaConsentimiento: dto.consentimientoEmail ? new Date() : undefined,
      organizacionId,
    },
  });
}

export async function obtenerContacto(
  id: string,
  organizacionId: string,
): Promise<Contacto & { acciones: unknown[] }> {
  const contacto = await prisma.contacto.findFirst({
    where: { id, organizacionId },
    include: { acciones: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  if (!contacto) throw new Error(`Contacto ${id} no encontrado`);
  return contacto;
}

export async function listarContactos(
  filtros: FiltrosContacto,
  organizacionId: string,
): Promise<PaginatedResponse<Contacto>> {
  const {
    especialidad, nivel, pais, estado, minScore, maxScore,
    etiqueta, fuente, conConsentimiento,
    page = 1, limit = 50,
    ordenarPor = 'createdAt', orden = 'desc',
    busqueda,
  } = filtros;

  const where: Record<string, unknown> = { organizacionId };

  if (especialidad) where.especialidadPrimaria = especialidad;
  if (nivel) where.nivelExperiencia = nivel;
  if (pais) where.pais = pais.toUpperCase();
  if (estado) where.estado = estado;
  if (fuente) where.fuente = fuente;
  if (conConsentimiento !== undefined) where.consentimientoEmail = conConsentimiento;
  if (minScore !== undefined || maxScore !== undefined) {
    where.leadScore = {
      ...(minScore !== undefined ? { gte: minScore } : {}),
      ...(maxScore !== undefined ? { lte: maxScore } : {}),
    };
  }
  if (etiqueta) {
    where.etiquetas = { contains: etiqueta };
  }
  if (busqueda) {
    where.OR = [
      { nombre: { contains: busqueda, mode: 'insensitive' } },
      { email: { contains: busqueda, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [total, contactos] = await Promise.all([
    prisma.contacto.count({ where }),
    prisma.contacto.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [ordenarPor]: orden },
    }),
  ]);

  return {
    ok: true,
    data: contactos,
    total,
    pagina: page,
    totalPaginas: Math.ceil(total / limit),
    limite: limit,
  };
}

export async function actualizarContacto(
  id: string,
  dto: ActualizarContactoDTO,
  organizacionId: string,
): Promise<Contacto> {
  await obtenerContacto(id, organizacionId); // Valida que existe y pertenece a la org

  const data: Record<string, unknown> = { ...dto };
  if (dto.certificaciones) data.certificaciones = serializarArray(dto.certificaciones);
  if (dto.etiquetas) data.etiquetas = serializarArray(dto.etiquetas);
  if (dto.email) data.email = dto.email.toLowerCase().trim();

  return prisma.contacto.update({ where: { id }, data });
}

export async function eliminarContacto(
  id: string,
  organizacionId: string,
): Promise<void> {
  await obtenerContacto(id, organizacionId);
  await prisma.contacto.delete({ where: { id } });
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

export async function estadisticasGenerales(organizacionId: string) {
  const filtroOrg = { organizacionId };

  const [
    total,
    porEstado,
    porPais,
    porEspecialidad,
    conConsentimiento,
    clientes,
    scorePromedio,
  ] = await Promise.all([
    prisma.contacto.count({ where: filtroOrg }),
    prisma.contacto.groupBy({ by: ['estado'], where: filtroOrg, _count: { id: true } }),
    prisma.contacto.groupBy({ by: ['pais'], where: filtroOrg, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 10 }),
    prisma.contacto.groupBy({ by: ['especialidadPrimaria'], where: filtroOrg, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.contacto.count({ where: { ...filtroOrg, consentimientoEmail: true } }),
    prisma.contacto.count({ where: { ...filtroOrg, estado: 'cliente' } }),
    prisma.contacto.aggregate({ where: filtroOrg, _avg: { leadScore: true } }),
  ]);

  return {
    total,
    conConsentimiento,
    clientes,
    tasaConversion: total > 0 ? ((clientes / total) * 100).toFixed(1) + '%' : '0%',
    scorePromedio: scorePromedio._avg.leadScore?.toFixed(1) ?? '0',
    porEstado: porEstado.reduce((acc, e) => ({ ...acc, [e.estado]: e._count.id }), {}),
    porPais: porPais.reduce((acc, e) => ({ ...acc, [e.pais]: e._count.id }), {}),
    porEspecialidad: porEspecialidad.reduce((acc, e) => ({ ...acc, [e.especialidadPrimaria]: e._count.id }), {}),
  };
}

// ─── Importación masiva ───────────────────────────────────────────────────────

export async function importarContactos(
  registros: Array<Record<string, string>>,
  organizacionId: string,
): Promise<{ importados: number; duplicados: number; errores: number; detalles: string[] }> {
  let importados = 0;
  let duplicados = 0;
  let errores = 0;
  const detalles: string[] = [];

  for (const registro of registros) {
    const email = registro.email?.toLowerCase().trim();
    if (!email) { errores++; detalles.push('Fila sin email — omitida'); continue; }

    try {
      const existente = await prisma.contacto.findFirst({
        where: { email, organizacionId },
      });
      if (existente) {
        duplicados++;
        detalles.push(`Duplicado: ${email}`);
        continue;
      }

      const dto: CrearContactoDTO = {
        email,
        nombre: registro.nombre || undefined,
        telefono: registro.telefono || undefined,
        pais: registro.pais?.toUpperCase() || 'MX',
        ciudad: registro.ciudad || undefined,
        especialidadPrimaria: (registro.especialidad as CrearContactoDTO['especialidadPrimaria']) || 'otro',
        nivelExperiencia: (registro.nivel as CrearContactoDTO['nivelExperiencia']) || 'principiante',
        fuente: (registro.fuente as CrearContactoDTO['fuente']) || 'manual',
        instagramUrl: registro.instagramUrl || undefined,
        telegramUsername: registro.telegramUsername || undefined,
        notas: registro.notas || undefined,
        etiquetas: registro.etiquetas ? registro.etiquetas.split('|') : [],
      };

      await crearContacto(dto, organizacionId);
      importados++;
    } catch (err) {
      errores++;
      detalles.push(`Error en ${email}: ${(err as Error).message}`);
    }
  }

  return { importados, duplicados, errores, detalles };
}

// ─── Segmentos predefinidos ───────────────────────────────────────────────────

export async function obtenerSegmento(
  nombre: string,
  organizacionId: string,
): Promise<Contacto[]> {
  const base = { organizacionId };
  const segmentos: Record<string, object> = {
    early_adopters: { ...base, consentimientoEmail: true, etiquetas: { contains: 'early_adopter' } },
    calientes: { ...base, leadScore: { gte: 70 }, consentimientoEmail: true, estado: { not: 'cliente' } },
    astrologos_establecidos: { ...base, especialidadPrimaria: { in: ['astrologia_tropical', 'astrologia_vedica'] }, nivelExperiencia: { in: ['avanzado', 'profesional'] }, consentimientoEmail: true },
    sin_contactar: { ...base, estado: 'prospecto', interacciones: 0 },
    clientes: { ...base, estado: 'cliente' },
  };

  const where = segmentos[nombre];
  if (!where) throw new Error(`Segmento desconocido: ${nombre}`);

  return prisma.contacto.findMany({ where, orderBy: { leadScore: 'desc' } });
}
