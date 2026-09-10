// ─── Endpoints de Scoring y Filtrado de Leads ──────────────────────────────────
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { calcularScoreInstagram, calcularScoreTikTok, DEFAULT_SCORING_CONFIG } from '../services/scraping/scoring.service';
import { filtrarLote, DEFAULT_FILTRO_CONFIG } from '../services/scraping/filter.service';

const router = Router();
const prisma = new PrismaClient();

// Todos los endpoints requieren autenticación
router.use(requireAuth);

// ─── GET /api/scoring/config — obtener configuración actual ─────────────────────
/**
 * Retorna la configuración de scoring para la organización.
 * Por defecto retorna la configuración estándar, pero se puede guardar
 * una personalizada por organización en la BD.
 */
router.get('/config', async (req: Request, res: Response) => {
  const orgId = req.usuario!.organizacionId;

  // Por ahora retornar config por defecto
  // TODO: Implementar almacenamiento de config por org en BD
  res.json({
    ok: true,
    config: DEFAULT_SCORING_CONFIG,
  });
});

// ─── POST /api/scoring/calcular-instagram — calcular score de un perfil ─────────
/**
 * Calcula el score de un perfil de Instagram
 * Body: { username, seguidores, siguiendo, publicaciones, esVerificado, bio, emailEnBio, especialidadDetectada }
 */
router.post('/calcular-instagram', async (req: Request, res: Response) => {
  const perfil = req.body;

  try {
    const score = calcularScoreInstagram(perfil);
    res.json({ ok: true, score });
  } catch (err) {
    res.status(400).json({ ok: false, error: 'Error al calcular score: ' + (err as any).message });
  }
});

// ─── POST /api/scoring/calcular-tiktok — calcular score de TikTok ────────────────
router.post('/calcular-tiktok', async (req: Request, res: Response) => {
  const perfil = req.body;

  try {
    const score = calcularScoreTikTok(perfil);
    res.json({ ok: true, score });
  } catch (err) {
    res.status(400).json({ ok: false, error: 'Error al calcular score: ' + (err as any).message });
  }
});

// ─── POST /api/scoring/filtrar-lote — filtrar lote de leads ────────────────────
/**
 * Filtra un lote de leads según configuración
 * Body: { leads: [...], fuente: 'instagram' | 'tiktok' | 'telegram', config?: {...} }
 */
router.post('/filtrar-lote', async (req: Request, res: Response) => {
  const { leads, fuente, config = DEFAULT_FILTRO_CONFIG } = req.body;

  if (!Array.isArray(leads)) {
    return res.status(400).json({ ok: false, error: 'leads debe ser un array' });
  }

  if (!['instagram', 'tiktok', 'telegram'].includes(fuente)) {
    return res.status(400).json({ ok: false, error: 'fuente inválida' });
  }

  try {
    const resultado = filtrarLote(leads, fuente, config);
    res.json({ ok: true, resultado });
  } catch (err) {
    res.status(400).json({ ok: false, error: 'Error al filtrar: ' + (err as any).message });
  }
});

// ─── GET /api/scoring/estadisticas — estadísticas de leads por fuente ────────────
/**
 * Retorna estadísticas de leads capturados por fuente
 * Filtrados, score promedio, etc.
 */
router.get('/estadisticas', async (req: Request, res: Response) => {
  const orgId = req.usuario!.organizacionId;

  try {
    // Contar contactos por fuente
    const estadisticas = await prisma.contacto.groupBy({
      by: ['fuente'],
      where: { organizacionId: orgId },
      _count: true,
      _avg: { score: true },
    });

    // Mapear a formato legible
    const resultado = Object.fromEntries(
      estadisticas.map((e) => [
        e.fuente || 'unknown',
        {
          total: e._count,
          scorePromedio: Math.round((e._avg.score || 0) * 10) / 10,
        },
      ]),
    );

    res.json({ ok: true, estadisticas: resultado });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al obtener estadísticas: ' + (err as any).message });
  }
});

// ─── GET /api/scoring/leads-por-etiqueta — leads filtrados por etiqueta ────────
/**
 * Retorna leads etiquetados por calidad
 * ?etiqueta=early_adopter|caliente|frio|potencial_bot|sin_contacto
 * ?fuente=instagram|tiktok|telegram
 * ?limit=20&page=1
 */
router.get('/leads-por-etiqueta', async (req: Request, res: Response) => {
  const orgId = req.usuario!.organizacionId;
  const { etiqueta, fuente, limit = '20', page = '1' } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;

  try {
    const where: any = { organizacionId: orgId };

    if (etiqueta) where.etiqueta = etiqueta;
    if (fuente) where.fuente = fuente;

    const [contactos, total] = await Promise.all([
      prisma.contacto.findMany({
        where,
        orderBy: { score: 'desc' },
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
      }),
      prisma.contacto.count({ where }),
    ]);

    res.json({
      ok: true,
      contactos,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al obtener leads: ' + (err as any).message });
  }
});

export default router;
