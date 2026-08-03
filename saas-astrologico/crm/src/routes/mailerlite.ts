// ─── Rutas de MailerLite ──────────────────────────────────────────────────────
import { Router, Request, Response, NextFunction } from 'express';
import { sincronizarContacto, sincronizarTodos, obtenerEstadisticasCampanas, listarGrupos } from '../services/mailerlite.service';
import { obtenerContacto } from '../services/contacto.service';

const router = Router();

/**
 * POST /api/mailerlite/sincronizar
 * Sincroniza TODOS los contactos con consentimiento a MailerLite.
 */
router.post('/sincronizar', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await sincronizarTodos();
    res.json({
      ok: true,
      mensaje: `Sincronización completada: ${resultado.exitosos}/${resultado.total} exitosos`,
      data: resultado,
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/mailerlite/sincronizar/:id
 * Sincroniza un contacto específico.
 */
router.post('/sincronizar/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contacto = await obtenerContacto(req.params.id, 'org-luz-holistica');
    const resultado = await sincronizarContacto(contacto as Parameters<typeof sincronizarContacto>[0]);
    res.json({ ok: true, data: resultado });
  } catch (err) { next(err); }
});

/**
 * GET /api/mailerlite/estadisticas
 * Devuelve estadísticas de las últimas campañas desde MailerLite.
 */
router.get('/estadisticas', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await obtenerEstadisticasCampanas();
    res.json({ ok: true, data: stats });
  } catch (err) { next(err); }
});

/**
 * GET /api/mailerlite/grupos
 * Lista todos los grupos de MailerLite.
 */
router.get('/grupos', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const grupos = await listarGrupos();
    res.json({ ok: true, data: grupos });
  } catch (err) { next(err); }
});

export default router;
