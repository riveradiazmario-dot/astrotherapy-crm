// ─── Rutas: Conversaciones ──────────────────────────────────────────────────
import { Router, Request, Response } from 'express';
import {
  registrarMensaje,
  listarConversaciones,
  obtenerMensajes,
  obtenerTimeline,
  cerrarConversacion,
} from '../services/conversaciones.service';

const router = Router();

// GET /api/conversaciones/:contactoId — listar hilos del contacto
router.get('/:contactoId', async (req: Request, res: Response) => {
  try {
    const data = await listarConversaciones(req.params.contactoId);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/conversaciones/:contactoId/timeline — timeline unificado
router.get('/:contactoId/timeline', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await obtenerTimeline(req.params.contactoId, limit);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/conversaciones/hilo/:conversacionId — mensajes de un hilo
router.get('/hilo/:conversacionId', async (req: Request, res: Response) => {
  try {
    const data = await obtenerMensajes(req.params.conversacionId);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/conversaciones/mensaje — registrar mensaje
router.post('/mensaje', async (req: Request, res: Response) => {
  const { contactoId, contenido } = req.body;
  if (!contactoId || !contenido) {
    return res.status(400).json({ error: 'contactoId y contenido son requeridos' });
  }
  try {
    const resultado = await registrarMensaje(req.body);
    return res.status(201).json(resultado);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/conversaciones/hilo/:conversacionId/cerrar — cerrar hilo
router.post('/hilo/:conversacionId/cerrar', async (req: Request, res: Response) => {
  try {
    await cerrarConversacion(req.params.conversacionId);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
