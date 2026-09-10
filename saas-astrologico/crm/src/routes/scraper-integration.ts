// ─── Rutas de Integración de Scrapers con CRM ─────────────────────────────────
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  importarLeadsInstagram,
  importarLeadsTikTok,
  importarLeadsTelegram,
  obtenerEstadisticasLeadsPorFuente,
} from '../services/scraping/scraper-integration.service';

const router = Router();

// Todos los endpoints requieren autenticación
router.use(requireAuth);

// ─── POST /api/scraper/importar/instagram ────────────────────────────────────

/**
 * Importar leads de Instagram directamente al CRM con scoring automático.
 *
 * Body:
 * {
 *   perfiles: [
 *     {
 *       username: "maria_astro",
 *       nombre?: "María García",
 *       bio?: "Astróloga...",
 *       emailEnBio: "maria@example.com",
 *       especialidadDetectada?: "astrologia",
 *       score?: { totalScore: 50, etiqueta: "caliente", ... }
 *     }
 *   ]
 * }
 */
router.post('/importar/instagram', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { perfiles } = req.body as { perfiles: any[] };
    if (!Array.isArray(perfiles) || perfiles.length === 0) {
      res.status(400).json({ ok: false, error: 'Body debe tener { perfiles: [...] }' });
      return;
    }

    const orgId = req.usuario!.organizacionId;
    const resultado = await importarLeadsInstagram(perfiles, orgId);

    res.json({ ok: true, ...resultado });
  } catch (err) { next(err); }
});

// ─── POST /api/scraper/importar/tiktok ───────────────────────────────────────

/**
 * Importar leads de TikTok al CRM con scoring automático.
 */
router.post('/importar/tiktok', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { perfiles } = req.body as { perfiles: any[] };
    if (!Array.isArray(perfiles) || perfiles.length === 0) {
      res.status(400).json({ ok: false, error: 'Body debe tener { perfiles: [...] }' });
      return;
    }

    const orgId = req.usuario!.organizacionId;
    const resultado = await importarLeadsTikTok(perfiles, orgId);

    res.json({ ok: true, ...resultado });
  } catch (err) { next(err); }
});

// ─── POST /api/scraper/importar/telegram ─────────────────────────────────────

/**
 * Importar leads de Telegram al CRM.
 * Extrae emails de cada canal y los crea como contactos separados.
 */
router.post('/importar/telegram', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { canales } = req.body as { canales: any[] };
    if (!Array.isArray(canales) || canales.length === 0) {
      res.status(400).json({ ok: false, error: 'Body debe tener { canales: [...] }' });
      return;
    }

    const orgId = req.usuario!.organizacionId;
    const resultado = await importarLeadsTelegram(canales, orgId);

    res.json({ ok: true, ...resultado });
  } catch (err) { next(err); }
});

// ─── GET /api/scraper/estadisticas ───────────────────────────────────────────

/**
 * Obtener estadísticas de leads importados desde scrapers.
 * Agrupado por fuente y etiqueta de calidad.
 */
router.get('/estadisticas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.usuario!.organizacionId;
    const stats = await obtenerEstadisticasLeadsPorFuente(orgId);
    res.json({ ok: true, data: stats });
  } catch (err) { next(err); }
});

export default router;
