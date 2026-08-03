// ─── Rutas: Secuencias (qué se ejecuta) ──────────────────────────────────────
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

// GET /api/sequences — listar secuencias con sus pasos
router.get('/', async (_req, res: Response) => {
  const { data, error } = await sb()
    .from('secuencias')
    .select('*, secuencia_pasos(*)')
    .order('createdAt', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/sequences/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await sb()
    .from('secuencias')
    .select('*, secuencia_pasos(*)')
    .eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Secuencia no encontrada' });
  return res.json(data);
});

// POST /api/sequences — crear secuencia con sus pasos
router.post('/', async (req: Request, res: Response) => {
  const { nombre, descripcion, pasos } = req.body as {
    nombre: string;
    descripcion?: string;
    pasos?: { tipo: string; config?: object; condicion_skip?: object }[];
  };
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

  const client = sb();
  const { data: seq, error } = await client
    .from('secuencias')
    .insert({ nombre, descripcion })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (Array.isArray(pasos) && pasos.length > 0) {
    await client.from('secuencia_pasos').insert(
      pasos.map((p, i) => ({
        secuenciaId: seq.id,
        orden: i,
        tipo: p.tipo,
        config: p.config ?? {},
        condicion_skip: p.condicion_skip ?? null,
      })),
    );
  }

  const { data: full } = await client
    .from('secuencias').select('*, secuencia_pasos(*)').eq('id', seq.id).single();
  return res.status(201).json(full);
});

// PUT /api/sequences/:id — actualizar metadatos
router.put('/:id', async (req: Request, res: Response) => {
  const { nombre, descripcion, activo } = req.body;
  const { data, error } = await sb()
    .from('secuencias')
    .update({ nombre, descripcion, activo, updatedAt: new Date().toISOString() })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/sequences/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await sb().from('secuencias').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// ─── CRUD de pasos ────────────────────────────────────────────────────────────

// POST /api/sequences/:id/pasos — agregar paso
router.post('/:id/pasos', async (req: Request, res: Response) => {
  const { tipo, config, condicion_skip, orden } = req.body;
  if (!tipo) return res.status(400).json({ error: 'tipo es requerido' });
  const { data, error } = await sb()
    .from('secuencia_pasos')
    .insert({ secuenciaId: req.params.id, tipo, config: config ?? {}, condicion_skip, orden: orden ?? 0 })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// PUT /api/sequences/pasos/:pasoId — actualizar paso
router.put('/pasos/:pasoId', async (req: Request, res: Response) => {
  const { data, error } = await sb()
    .from('secuencia_pasos')
    .update(req.body)
    .eq('id', req.params.pasoId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/sequences/pasos/:pasoId — eliminar paso
router.delete('/pasos/:pasoId', async (req: Request, res: Response) => {
  const { error } = await sb().from('secuencia_pasos').delete().eq('id', req.params.pasoId);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
