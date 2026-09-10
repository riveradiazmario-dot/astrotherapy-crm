// ─── Dashboard de Scoring y Lead Quality ──────────────────────────────────────
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  obtenerEstadisticasGenerales,
  obtenerEstadisticasPorFuente,
  obtenerTendenciaScores,
  obtenerTopLeads,
  obtenerMetricasConversion,
} from '../services/scraping/dashboard.service';

const router = Router();

// Todos los endpoints requieren autenticación
router.use(requireAuth);

// ─── GET /api/dashboard/general ──────────────────────────────────────────────

/**
 * Obtiene estadísticas generales de todos los leads de la organización.
 * Incluye: total, por fuente, por etiqueta, distribución de scores.
 */
router.get('/general', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.usuario!.organizacionId;
    const stats = await obtenerEstadisticasGenerales(orgId);
    res.json({ ok: true, data: stats });
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/por-fuente ───────────────────────────────────────────

/**
 * Estadísticas detalladas por fuente de scraping.
 * Query params:
 *   ?fuente=instagram|tiktok|telegram  (opcional, filtrar por fuente)
 */
router.get('/por-fuente', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.usuario!.organizacionId;
    const { fuente } = req.query;
    const stats = await obtenerEstadisticasPorFuente(
      orgId,
      fuente ? (fuente as string) : undefined,
    );
    res.json({ ok: true, data: stats });
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/tendencia ────────────────────────────────────────────

/**
 * Tendencias de scoring en el tiempo.
 * Query params:
 *   ?diasAtras=30  (default 30, cuántos días mirar hacia atrás)
 */
router.get('/tendencia', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.usuario!.organizacionId;
    const diasAtras = parseInt((req.query.diasAtras as string) || '30');
    const tendencia = await obtenerTendenciaScores(orgId, Math.max(1, diasAtras));
    res.json({ ok: true, data: tendencia });
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/top-leads ────────────────────────────────────────────

/**
 * Top leads ordenados por score.
 * Query params:
 *   ?limite=20            (default 20)
 *   ?etiqueta=early_adopter|caliente|frio|potencial_bot|sin_contacto
 *   ?fuente=instagram|tiktok|telegram
 */
router.get('/top-leads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.usuario!.organizacionId;
    const limite = Math.min(parseInt((req.query.limite as string) || '20'), 100);
    const { etiqueta, fuente } = req.query;

    const leads = await obtenerTopLeads(
      orgId,
      limite,
      etiqueta ? (etiqueta as string) : undefined,
      fuente ? (fuente as string) : undefined,
    );

    res.json({ ok: true, data: leads, total: leads.length });
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/metricas-conversion ──────────────────────────────────

/**
 * Métricas de conversión por etiqueta.
 * Muestra: total, con email, con contacto, tasas por etiqueta.
 */
router.get('/metricas-conversion', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.usuario!.organizacionId;
    const metricas = await obtenerMetricasConversion(orgId);
    res.json({ ok: true, data: metricas });
  } catch (err) { next(err); }
});

// ─── Resumen completo del dashboard ──────────────────────────────────────────

/**
 * GET /api/dashboard/resumen
 *
 * Retorna todos los datos del dashboard en una sola llamada.
 * Útil para cargar el dashboard completo de una vez.
 */
router.get('/resumen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.usuario!.organizacionId;

    const [general, porFuente, tendencia, topLeads, metricas] = await Promise.all([
      obtenerEstadisticasGenerales(orgId),
      obtenerEstadisticasPorFuente(orgId),
      obtenerTendenciaScores(orgId, 30),
      obtenerTopLeads(orgId, 10),
      obtenerMetricasConversion(orgId),
    ]);

    res.json({
      ok: true,
      data: {
        general,
        porFuente,
        tendencia,
        topLeads,
        metricas,
      },
    });
  } catch (err) { next(err); }
});

export default router;
