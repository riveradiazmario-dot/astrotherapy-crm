// ─── Rutas de Pipeline / Oportunidades ───────────────────────────────────────
import { Router, Request, Response, NextFunction } from 'express';
import {
  crearOportunidad,
  obtenerOportunidad,
  listarOportunidades,
  moverEtapa,
  actualizarOportunidad,
  eliminarOportunidad,
  ETAPAS_INFO,
  ETAPAS_ORDEN,
  EtapaPipeline,
} from '../services/oportunidad.service';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/pipeline — Tablero completo (por etapas)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await listarOportunidades(req.usuario!.organizacionId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
});

// GET /api/pipeline/etapas — Metadatos de etapas
router.get('/etapas', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: ETAPAS_ORDEN.map(e => ({ id: e, ...ETAPAS_INFO[e] })),
  });
});

// GET /api/pipeline/:id — Una oportunidad
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const op = await obtenerOportunidad(req.params.id, req.usuario!.organizacionId);
    res.json({ ok: true, data: op });
  } catch (err) { next(err); }
});

// POST /api/pipeline — Crear oportunidad
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { titulo } = req.body;
    if (!titulo) { res.status(400).json({ ok: false, error: 'El campo titulo es requerido' }); return; }
    const op = await crearOportunidad(req.body, req.usuario!.organizacionId);
    res.status(201).json({ ok: true, data: op });
  } catch (err) { next(err); }
});

// PUT /api/pipeline/:id — Actualizar oportunidad
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const op = await actualizarOportunidad(req.params.id, req.body, req.usuario!.organizacionId);
    res.json({ ok: true, data: op });
  } catch (err) { next(err); }
});

// PATCH /api/pipeline/:id/etapa — Mover a otra etapa (drag & drop)
router.patch('/:id/etapa', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { etapa, motivoPerdida } = req.body as { etapa: EtapaPipeline; motivoPerdida?: string };
    if (!etapa || !ETAPAS_ORDEN.includes(etapa)) {
      res.status(400).json({ ok: false, error: `Etapa inválida. Válidas: ${ETAPAS_ORDEN.join(', ')}` });
      return;
    }
    const op = await moverEtapa(req.params.id, etapa, req.usuario!.organizacionId, motivoPerdida);
    res.json({ ok: true, data: op });
  } catch (err) { next(err); }
});

// DELETE /api/pipeline/:id — Eliminar
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await eliminarOportunidad(req.params.id, req.usuario!.organizacionId);
    res.json({ ok: true, mensaje: 'Oportunidad eliminada' });
  } catch (err) { next(err); }
});

export default router;
