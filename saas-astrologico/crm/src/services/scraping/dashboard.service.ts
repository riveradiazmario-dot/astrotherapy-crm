// ─── Dashboard de Scoring y Calidad de Leads ─────────────────────────────────
// Proporciona datos agregados para visualización de métricas de leads

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EstadisticasGenerales {
  totalContactos: number;
  contactosPorFuente: Record<string, number>;
  contactosPorEtiqueta: Record<string, number>;
  scorePromedio: number;
  distribucionScores: {
    rango: string;
    cantidad: number;
    porcentaje: number;
  }[];
}

export interface EstadisticasPorFuente {
  fuente: string;
  total: number;
  scorePromedio: number;
  distribucion: {
    early_adopter: number;
    caliente: number;
    frio: number;
    potencial_bot: number;
    sin_contacto: number;
  };
  conEmail: number;
  conContacto: number;
  tasaContactabilidad: number;
}

export interface TendenciaScore {
  fechaCreacion: string;
  cantidad: number;
  scorePromedio: number;
  etiquetas: {
    early_adopter: number;
    caliente: number;
    frio: number;
  };
}

/**
 * Obtener estadísticas generales de todos los leads
 */
export async function obtenerEstadisticasGenerales(
  organizacionId: string,
): Promise<EstadisticasGenerales> {
  // Total de contactos
  const totalContactos = await prisma.contacto.count({
    where: { organizacionId },
  });

  // Contactos por fuente
  const porFuente = await prisma.contacto.groupBy({
    by: ['fuente'],
    where: { organizacionId },
    _count: true,
  });

  const contactosPorFuente = Object.fromEntries(
    porFuente.map(f => [f.fuente || 'unknown', f._count]),
  );

  // Contactos por etiqueta
  const porEtiqueta = await prisma.contacto.groupBy({
    by: ['etiqueta'],
    where: { organizacionId },
    _count: true,
  });

  const contactosPorEtiqueta = Object.fromEntries(
    porEtiqueta.map(e => [e.etiqueta || 'sin_etiqueta', e._count]),
  );

  // Score promedio
  const stats = await prisma.contacto.aggregate({
    where: { organizacionId },
    _avg: { score: true },
    _count: true,
  });

  const scorePromedio = stats._avg.score ? Math.round(stats._avg.score * 10) / 10 : 0;

  // Distribución de scores
  const rangos = [
    { rango: '0-10', min: 0, max: 10 },
    { rango: '11-20', min: 11, max: 20 },
    { rango: '21-30', min: 21, max: 30 },
    { rango: '31-40', min: 31, max: 40 },
    { rango: '41-50', min: 41, max: 50 },
    { rango: '51+', min: 51, max: 999 },
  ];

  const distribucionScores = [];

  for (const r of rangos) {
    const count = await prisma.contacto.count({
      where: {
        organizacionId,
        score: { gte: r.min, lte: r.max },
      },
    });

    const porcentaje = totalContactos > 0 ? Math.round((count / totalContactos) * 100) : 0;
    distribucionScores.push({
      rango: r.rango,
      cantidad: count,
      porcentaje,
    });
  }

  return {
    totalContactos,
    contactosPorFuente,
    contactosPorEtiqueta,
    scorePromedio,
    distribucionScores,
  };
}

/**
 * Estadísticas detalladas por fuente
 */
export async function obtenerEstadisticasPorFuente(
  organizacionId: string,
  fuente?: string,
): Promise<EstadisticasPorFuente[]> {
  const where: any = { organizacionId };
  if (fuente) where.fuente = fuente;

  const porFuente = await prisma.contacto.groupBy({
    by: ['fuente'],
    where,
    _count: true,
    _avg: { score: true },
  });

  const resultados: EstadisticasPorFuente[] = [];

  for (const f of porFuente) {
    const fuente_actual = f.fuente || 'unknown';

    // Contar por etiqueta
    const porEtiqueta = await prisma.contacto.groupBy({
      by: ['etiqueta'],
      where: { organizacionId, fuente: fuente_actual },
      _count: true,
    });

    const distribucion = {
      early_adopter: 0,
      caliente: 0,
      frio: 0,
      potencial_bot: 0,
      sin_contacto: 0,
    };

    porEtiqueta.forEach(e => {
      if (e.etiqueta in distribucion) {
        distribucion[e.etiqueta as keyof typeof distribucion] = e._count;
      }
    });

    // Contactabilidad
    const conEmail = await prisma.contacto.count({
      where: { organizacionId, fuente: fuente_actual, email: { not: null } },
    });

    const conTelefono = await prisma.contacto.count({
      where: { organizacionId, fuente: fuente_actual, telefono: { not: null } },
    });

    const conContacto = conEmail + conTelefono;
    const tasaContactabilidad = f._count > 0 ? Math.round((conContacto / f._count) * 100) : 0;

    resultados.push({
      fuente: fuente_actual,
      total: f._count,
      scorePromedio: f._avg.score ? Math.round(f._avg.score * 10) / 10 : 0,
      distribucion,
      conEmail,
      conContacto,
      tasaContactabilidad,
    });
  }

  return resultados;
}

/**
 * Tendencias de scoring en el tiempo
 */
export async function obtenerTendenciaScores(
  organizacionId: string,
  diasAtras: number = 30,
): Promise<TendenciaScore[]> {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - diasAtras);

  const contactos = await prisma.contacto.findMany({
    where: {
      organizacionId,
      createdAt: { gte: fechaLimite },
    },
    select: {
      createdAt: true,
      score: true,
      etiqueta: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const porFecha = new Map<string, TendenciaScore>();

  for (const c of contactos) {
    const fecha = c.createdAt.toISOString().split('T')[0];
    if (!porFecha.has(fecha)) {
      porFecha.set(fecha, {
        fechaCreacion: fecha,
        cantidad: 0,
        scorePromedio: 0,
        etiquetas: { early_adopter: 0, caliente: 0, frio: 0 },
      });
    }

    const stats = porFecha.get(fecha)!;
    stats.cantidad += 1;
    stats.scorePromedio += c.score || 0;

    if (c.etiqueta === 'early_adopter') stats.etiquetas.early_adopter += 1;
    else if (c.etiqueta === 'caliente') stats.etiquetas.caliente += 1;
    else if (c.etiqueta === 'frio') stats.etiquetas.frio += 1;
  }

  const tendencias: TendenciaScore[] = [];
  porFecha.forEach(t => {
    t.scorePromedio = Math.round((t.scorePromedio / t.cantidad) * 10) / 10;
    tendencias.push(t);
  });

  return tendencias;
}

/**
 * Top leads por score
 */
export async function obtenerTopLeads(
  organizacionId: string,
  limite: number = 20,
  etiqueta?: string,
  fuente?: string,
): Promise<any[]> {
  const where: any = { organizacionId };
  if (etiqueta) where.etiqueta = etiqueta;
  if (fuente) where.fuente = fuente;

  return await prisma.contacto.findMany({
    where,
    orderBy: { score: 'desc' },
    take: limite,
    select: {
      id: true,
      nombre: true,
      email: true,
      score: true,
      etiqueta: true,
      fuente: true,
      especialidad: true,
      createdAt: true,
    },
  });
}

/**
 * Métricas de conversión por etiqueta
 */
export async function obtenerMetricasConversion(
  organizacionId: string,
): Promise<any> {
  const etiquetas = ['early_adopter', 'caliente', 'frio', 'potencial_bot', 'sin_contacto'];
  const metricas: Record<string, any> = {};

  for (const etiqueta of etiquetas) {
    const total = await prisma.contacto.count({
      where: { organizacionId, etiqueta },
    });

    const conEmail = await prisma.contacto.count({
      where: { organizacionId, etiqueta, email: { not: null } },
    });

    const conContacto = await prisma.contacto.count({
      where: {
        organizacionId,
        etiqueta,
        OR: [{ email: { not: null } }, { telefono: { not: null } }],
      },
    });

    metricas[etiqueta] = {
      total,
      conEmail,
      conContacto,
      tasaEmail: total > 0 ? Math.round((conEmail / total) * 100) : 0,
      tasaContactabilidad: total > 0 ? Math.round((conContacto / total) * 100) : 0,
    };
  }

  return metricas;
}
