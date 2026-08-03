// ─── Rutas: Módulo IA ─────────────────────────────────────────────────────
import { Router, Request, Response } from 'express';
import {
  calcularScore,
  aplicarScore,
  recalcularScoresGlobal,
  generarResumen,
  sugerirProximoPaso,
} from '../services/ia.service';

const router = Router();

// ─── GET /api/ia/:contactoId/score — calcular score (sin aplicar) ──────────
router.get('/:contactoId/score', async (req: Request, res: Response) => {
  try {
    const result = await calcularScore(req.params.contactoId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ─── POST /api/ia/:contactoId/score/aplicar — calcular y guardar ───────────
router.post('/:contactoId/score/aplicar', async (req: Request, res: Response) => {
  try {
    const result = await aplicarScore(req.params.contactoId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ─── POST /api/ia/scores/recalcular — batch: todos los contactos ───────────
router.post('/scores/recalcular', async (_req: Request, res: Response) => {
  try {
    const result = await recalcularScoresGlobal();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ─── GET /api/ia/:contactoId/resumen — perfil ejecutivo ────────────────────
router.get('/:contactoId/resumen', async (req: Request, res: Response) => {
  try {
    const resumen = await generarResumen(req.params.contactoId);
    return res.json(resumen);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ─── GET /api/ia/:contactoId/sugerencias — próximos pasos ─────────────────
router.get('/:contactoId/sugerencias', async (req: Request, res: Response) => {
  try {
    const sugerencias = await sugerirProximoPaso(req.params.contactoId);
    return res.json(sugerencias);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ─── GET /api/ia/:contactoId/completo — score + resumen + sugerencias ──────
router.get('/:contactoId/completo', async (req: Request, res: Response) => {
  try {
    const [score, resumen, sugerencias] = await Promise.all([
      calcularScore(req.params.contactoId),
      generarResumen(req.params.contactoId),
      sugerirProximoPaso(req.params.contactoId),
    ]);
    return res.json({ score, resumen, sugerencias });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
