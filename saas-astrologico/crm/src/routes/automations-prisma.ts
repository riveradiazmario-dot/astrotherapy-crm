// ─── Rutas: Automatizaciones (Prisma) ──────────────────────────────────────────
import { Router, Request, Response } from 'express';
import { dispatchEvento, listarAutomatizaciones } from '../services/automations/engine-prisma';
import { crearSecuencia, listarSecuencias, obtenerSecuencia, crearPaso, actualizarSecuencia } from '../services/automations/secuencias.service';
import { actionRegistry } from '../services/automations/action.registry';

const router = Router();

// ═══ SECUENCIAS ════════════════════════════════════════════════════════════════

// GET /api/automations-prisma/secuencias
router.get('/secuencias', async (_req: Request, res: Response) => {
  try {
    const secuencias = await listarSecuencias();
    return res.json(secuencias);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/automations-prisma/secuencias/:id
router.get('/secuencias/:id', async (req: Request, res: Response) => {
  try {
    const secuencia = await obtenerSecuencia(req.params.id);
    if (!secuencia) return res.status(404).json({ error: 'Secuencia no encontrada' });
    return res.json(secuencia);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/automations-prisma/secuencias
router.post('/secuencias', async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, tipo } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });

    const secuencia = await crearSecuencia(nombre, descripcion || null, tipo || 'bienvenida');
    return res.status(201).json(secuencia);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /api/automations-prisma/secuencias/:id
router.put('/secuencias/:id', async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, activo } = req.body;
    const secuencia = await actualizarSecuencia(req.params.id, {
      ...(nombre && { nombre }),
      ...(descripcion && { descripcion }),
      ...(typeof activo === 'boolean' && { activo }),
    });
    return res.json(secuencia);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ═══ PASOS ═════════════════════════════════════════════════════════════════════

// POST /api/automations-prisma/secuencias/:secuenciaId/pasos
router.post('/secuencias/:secuenciaId/pasos', async (req: Request, res: Response) => {
  try {
    const { orden, tipo, config, condicion_skip } = req.body;
    if (!orden || !tipo || !config) {
      return res.status(400).json({ error: 'orden, tipo, config requeridos' });
    }

    const paso = await crearPaso(req.params.secuenciaId, orden, tipo, config, condicion_skip);
    return res.status(201).json(paso);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ═══ AUTOMATIZACIONES ══════════════════════════════════════════════════════════

// GET /api/automations-prisma/automatizaciones
router.get('/automatizaciones', async (_req: Request, res: Response) => {
  try {
    const automatizaciones = await listarAutomatizaciones();
    return res.json(automatizaciones);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ═══ DISPATCH (DISPARAR EVENTO) ════════════════════════════════════════════════

// POST /api/automations-prisma/dispatch
router.post('/dispatch', async (req: Request, res: Response) => {
  try {
    const { evento, contactoId, organizacionId } = req.body;
    if (!evento || !contactoId) {
      return res.status(400).json({ error: 'evento y contactoId requeridos' });
    }

    const payload = {
      contactoId,
      ...req.body,
    };

    const resultado = await dispatchEvento(evento, payload, organizacionId || 'org-luz-holistica');
    return res.json(resultado);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ═══ HANDLERS (DEBUG) ══════════════════════════════════════════════════════════

// GET /api/automations-prisma/action-handlers
router.get('/action-handlers', (_req: Request, res: Response) => {
  return res.json({ handlers: actionRegistry.listar() });
});

export default router;
