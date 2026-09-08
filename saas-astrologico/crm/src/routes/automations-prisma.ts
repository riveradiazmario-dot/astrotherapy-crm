// ─── Rutas: Automatizaciones (Prisma) ──────────────────────────────────────────
import { Router, Request, Response } from 'express';
import { dispatchEvento, listarAutomatizaciones } from '../services/automations/engine-prisma';
import { crearSecuencia, listarSecuencias, obtenerSecuencia, crearPaso, actualizarSecuencia } from '../services/automations/secuencias.service';
import { actionRegistry } from '../services/automations/action.registry';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Middleware para extraer organizacionId del JWT
const getOrgId = (req: Request) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return 'org-luz-holistica';
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.organizacionId || 'org-luz-holistica';
  } catch {
    return 'org-luz-holistica';
  }
};

// ═══ SECUENCIAS ════════════════════════════════════════════════════════════════

// GET /api/automations-prisma/secuencias
router.get('/secuencias', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const secuencias = await listarSecuencias(orgId);
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
    const { nombre, descripcion, tipo, organizacionId } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });

    // Use provided organizacionId or extract from JWT or use default
    let orgId = organizacionId || getOrgId(req);

    // Debug log
    console.log('[Automations] Creating secuencia', { nombre, orgId });

    const secuencia = await crearSecuencia(nombre, descripcion || null, tipo || 'bienvenida', orgId);
    return res.status(201).json(secuencia);
  } catch (err) {
    console.error('[Automations Error]', err);
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
    const { evento, contactoId } = req.body;
    if (!evento || !contactoId) {
      return res.status(400).json({ error: 'evento y contactoId requeridos' });
    }

    const payload = {
      contactoId,
      ...req.body,
    };

    const orgId = getOrgId(req);
    const resultado = await dispatchEvento(evento, payload, orgId);
    return res.json(resultado);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ═══ HANDLERS (DEBUG) ══════════════════════════════════════════════════════════

// ═══ HANDLERS (DEBUG) ══════════════════════════════════════════════════════════

// GET /api/automations-prisma/action-handlers
router.get('/action-handlers', (_req: Request, res: Response) => {
  return res.json({ handlers: actionRegistry.listar() });
});

// GET /api/automations-prisma/debug/orgid
router.get('/debug/orgid', (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  return res.json({ organizacionId: orgId });
});

// GET /api/automations-prisma/debug/organizaciones
router.get('/debug/organizaciones', async (_req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const orgs = await prisma.organizacion.findMany({
      select: { id, nombre },
    });
    await prisma.$disconnect();
    return res.json(orgs);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
