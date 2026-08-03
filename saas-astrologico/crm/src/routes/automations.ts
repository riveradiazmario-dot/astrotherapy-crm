// ─── Rutas: Automatizaciones (cuándo) ────────────────────────────────────────
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { dispatchEvento } from '../services/automations/engine';
import { actionRegistry } from '../services/automations/action.registry';

const router = Router();
const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

// GET /api/automations
router.get('/', async (_req, res: Response) => {
  const { data, error } = await sb()
    .from('automatizaciones')
    .select('*, secuencias(id, nombre)')
    .order('createdAt', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/automations
router.post('/', async (req: Request, res: Response) => {
  const { nombre, descripcion, trigger_evento, trigger_condiciones, secuenciaId } = req.body;
  if (!nombre || !trigger_evento || !secuenciaId) {
    return res.status(400).json({ error: 'nombre, trigger_evento y secuenciaId son requeridos' });
  }
  const { data, error } = await sb()
    .from('automatizaciones')
    .insert({ nombre, descripcion, trigger_evento, trigger_condiciones: trigger_condiciones ?? {}, secuenciaId })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PUT /api/automations/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { data, error } = await sb()
    .from('automatizaciones')
    .update({ ...req.body, updatedAt: new Date().toISOString() })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/automations/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await sb().from('automatizaciones').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// POST /api/automations/dispatch — disparar evento manualmente
router.post('/dispatch', async (req: Request, res: Response) => {
  const { evento, payload, organizacionId } = req.body as {
    evento: string; payload: Record<string, unknown>; organizacionId?: string;
  };
  if (!evento || !payload) return res.status(400).json({ error: 'evento y payload requeridos' });
  try {
    await dispatchEvento(evento, payload, organizacionId);
    return res.json({ ok: true, evento });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// GET /api/automations/action-handlers — handlers registrados en el motor
router.get('/action-handlers', (_req, res: Response) =>
  res.json({ handlers: actionRegistry.listar() }));

// GET /api/automations/:id/logs
router.get('/:id/logs', async (req: Request, res: Response) => {
  const { data, error } = await sb()
    .from('automatizacion_logs')
    .select('*').eq('automatizacionId', req.params.id)
    .order('createdAt', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
