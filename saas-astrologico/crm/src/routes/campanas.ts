// ─── Módulo C: Campaign Builder — /api/campanas ──────────────────────────────
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { enviarCampana } from '../services/smtp.service';

const router = Router();
const prisma = new PrismaClient();

// Todos los endpoints requieren sesión
router.use(requireAuth);

// ─── GET /api/campanas — listar campañas de la org ───────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const { estado, tipo, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizacionId: req.usuario!.organizacionId };
  if (estado) where.estado = estado;
  if (tipo) where.tipo = tipo;

  const [campanas, total] = await Promise.all([
    prisma.campana.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.campana.count({ where }),
  ]);

  res.json({ ok: true, campanas, total, page: parseInt(page) });
});

// ─── GET /api/campanas/stats — estadísticas globales ─────────────────────────
router.get('/stats', async (req: Request, res: Response) => {
  const orgId = req.usuario!.organizacionId;

  const [total, porEstado, totalesEnvio] = await Promise.all([
    prisma.campana.count({ where: { organizacionId: orgId } }),
    prisma.campana.groupBy({
      by: ['estado'],
      where: { organizacionId: orgId },
      _count: { id: true },
    }),
    prisma.campana.aggregate({
      where: { organizacionId: orgId },
      _sum: { totalEnviados: true, totalAbiertos: true, totalClics: true },
    }),
  ]);

  const estadoMap = Object.fromEntries(
    porEstado.map((r) => [r.estado, r._count.id])
  );

  const enviados = totalesEnvio._sum.totalEnviados ?? 0;
  const abiertos = totalesEnvio._sum.totalAbiertos ?? 0;
  const clics = totalesEnvio._sum.totalClics ?? 0;

  res.json({
    ok: true,
    total,
    porEstado: estadoMap,
    totales: { enviados, abiertos, clics },
    tasaApertura: enviados > 0 ? Math.round((abiertos / enviados) * 100) : 0,
    tasaClics: enviados > 0 ? Math.round((clics / enviados) * 100) : 0,
  });
});

// ─── GET /api/campanas/:id — detalle de una campaña ──────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const campana = await prisma.campana.findFirst({
    where: { id: req.params.id, organizacionId: req.usuario!.organizacionId },
  });
  if (!campana) return res.status(404).json({ ok: false, error: 'Campaña no encontrada' });
  res.json({ ok: true, campana });
});

// ─── POST /api/campanas — crear campaña ──────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const {
    nombre, descripcion, tipo = 'email', segmento,
  } = req.body as {
    nombre: string;
    descripcion?: string;
    tipo?: string;
    segmento?: string;
  };

  if (!nombre) return res.status(400).json({ ok: false, error: 'El nombre es requerido' });

  const campana = await prisma.campana.create({
    data: {
      nombre,
      // descripcion llega ya serializada como JSON desde el wizard
      ...(descripcion !== undefined && { descripcion }),
      tipo,
      estado: 'borrador',
      segmento: segmento ? JSON.stringify(segmento) : null,
      organizacionId: req.usuario!.organizacionId,
    },
  });

  res.status(201).json({ ok: true, campana });
});

// ─── PUT /api/campanas/:id — actualizar campaña ───────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  const orgId = req.usuario!.organizacionId;

  const existente = await prisma.campana.findFirst({
    where: { id: req.params.id, organizacionId: orgId },
  });
  if (!existente) return res.status(404).json({ ok: false, error: 'Campaña no encontrada' });
  if (['enviando', 'completada'].includes(existente.estado)) {
    return res.status(400).json({ ok: false, error: 'No se puede editar una campaña en estado enviando o completada' });
  }

  const {
    nombre, descripcion, tipo, segmento, estado,
  } = req.body as Record<string, string>;

  const campana = await prisma.campana.update({
    where: { id: req.params.id },
    data: {
      ...(nombre && { nombre }),
      ...(tipo && { tipo }),
      ...(estado && ['borrador', 'programada', 'pausada'].includes(estado) && { estado }),
      segmento: segmento !== undefined ? JSON.stringify(segmento) : existente.segmento,
      // El wizard envía descripcion ya como JSON serializado — se almacena tal cual
      ...(descripcion !== undefined && { descripcion }),
    },
  });

  res.json({ ok: true, campana });
});

// ─── DELETE /api/campanas/:id — eliminar campaña ─────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const orgId = req.usuario!.organizacionId;

  const existente = await prisma.campana.findFirst({
    where: { id: req.params.id, organizacionId: orgId },
  });
  if (!existente) return res.status(404).json({ ok: false, error: 'Campaña no encontrada' });
  if (existente.estado === 'enviando') {
    return res.status(400).json({ ok: false, error: 'No se puede eliminar una campaña en curso' });
  }

  await prisma.campana.delete({ where: { id: req.params.id } });
  res.json({ ok: true, eliminada: req.params.id });
});

// ─── POST /api/campanas/:id/duplicar — clonar campaña ────────────────────────
router.post('/:id/duplicar', async (req: Request, res: Response) => {
  const original = await prisma.campana.findFirst({
    where: { id: req.params.id, organizacionId: req.usuario!.organizacionId },
  });
  if (!original) return res.status(404).json({ ok: false, error: 'Campaña no encontrada' });

  const copia = await prisma.campana.create({
    data: {
      nombre: `${original.nombre} (copia)`,
      descripcion: original.descripcion,
      tipo: original.tipo,
      estado: 'borrador',
      segmento: original.segmento,
      organizacionId: original.organizacionId,
    },
  });

  res.status(201).json({ ok: true, campana: copia });
});

// ─── POST /api/campanas/:id/enviar — lanzar campaña ─────────────────────────
router.post('/:id/enviar', async (req: Request, res: Response) => {
  const orgId = req.usuario!.organizacionId;

  const campana = await prisma.campana.findFirst({
    where: { id: req.params.id, organizacionId: orgId },
  });
  if (!campana) return res.status(404).json({ ok: false, error: 'Campaña no encontrada' });
  if (campana.estado === 'enviando') {
    return res.status(400).json({ ok: false, error: 'La campaña ya se está enviando' });
  }
  if (campana.estado === 'completada') {
    return res.status(400).json({ ok: false, error: 'La campaña ya fue enviada. Duplícala para reenviar.' });
  }

  // Extraer asunto/html desde el campo descripcion (JSON embebido)
  let asunto = `Campaña: ${campana.nombre}`;
  let html = `<p>Contenido de la campaña: <strong>${campana.nombre}</strong></p>`;
  try {
    const meta = JSON.parse(campana.descripcion ?? '{}');
    if (meta.asunto) asunto = meta.asunto;
    if (meta.html) html = meta.html;
  } catch { /* descripcion es texto plano */ }

  // Extraer segmento
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let segFiltro: any = {};
  try { segFiltro = campana.segmento ? JSON.parse(campana.segmento) : {}; } catch { /**/ }

  // Construir where de contactos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizacionId: orgId, consentimientoEmail: true };
  if (segFiltro.estado) where.estado = segFiltro.estado;
  if (segFiltro.especialidad) where.especialidadPrimaria = segFiltro.especialidad;
  if (segFiltro.etiqueta) where.etiquetas = { contains: segFiltro.etiqueta };
  if (segFiltro.pais) where.pais = segFiltro.pais;

  const contactos = await prisma.contacto.findMany({
    where,
    select: { email: true, nombre: true },
  });

  const destinatarios = contactos
    .filter((c) => !!c.email)
    .map((c) => ({ email: c.email!, nombre: c.nombre ?? '' }));

  if (destinatarios.length === 0) {
    return res.json({
      ok: true,
      mensaje: 'Ningún contacto cumple el segmento o tiene consentimiento.',
      totalContactos: 0,
    });
  }

  // Marcar como enviando
  await prisma.campana.update({
    where: { id: campana.id },
    data: { estado: 'enviando', totalContactos: destinatarios.length },
  });

  // Envío asíncrono — respondemos inmediatamente
  res.json({
    ok: true,
    mensaje: `Enviando a ${destinatarios.length} contactos en segundo plano.`,
    totalContactos: destinatarios.length,
    campanaId: campana.id,
  });

  // Envío real (en background)
  enviarCampana(destinatarios, asunto, html, 400)
    .then(async (resultado) => {
      await prisma.campana.update({
        where: { id: campana.id },
        data: {
          estado: 'completada',
          totalEnviados: resultado.enviados ?? destinatarios.length,
        },
      });
    })
    .catch(async () => {
      await prisma.campana.update({
        where: { id: campana.id },
        data: { estado: 'borrador' }, // revertir para permitir reintentar
      });
    });
});

// ─── GET /api/campanas/:id/preview — preview de destinatarios ────────────────
router.get('/:id/preview', async (req: Request, res: Response) => {
  const orgId = req.usuario!.organizacionId;

  const campana = await prisma.campana.findFirst({
    where: { id: req.params.id, organizacionId: orgId },
  });
  if (!campana) return res.status(404).json({ ok: false, error: 'Campaña no encontrada' });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let segFiltro: any = {};
  try { segFiltro = campana.segmento ? JSON.parse(campana.segmento) : {}; } catch { /**/ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizacionId: orgId, consentimientoEmail: true };
  if (segFiltro.estado) where.estado = segFiltro.estado;
  if (segFiltro.especialidad) where.especialidadPrimaria = segFiltro.especialidad;
  if (segFiltro.etiqueta) where.etiquetas = { contains: segFiltro.etiqueta };
  if (segFiltro.pais) where.pais = segFiltro.pais;

  const [total, muestra] = await Promise.all([
    prisma.contacto.count({ where }),
    prisma.contacto.findMany({
      where,
      select: { nombre: true, email: true, especialidadPrimaria: true, pais: true },
      take: 5,
    }),
  ]);

  res.json({ ok: true, total, muestra });
});

export default router;
