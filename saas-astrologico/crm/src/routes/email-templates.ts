// Endpoint de plantillas de email predefinidas
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { EMAIL_TEMPLATES } from '../data/email-templates';

const router = Router();

// Todos los endpoints requieren sesión
router.use(requireAuth);

// GET /api/email-templates — obtener todas las plantillas predefinidas
router.get('/', async (req: Request, res: Response) => {
  res.json({
    ok: true,
    templates: EMAIL_TEMPLATES.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      descripcion: t.descripcion,
      tipo: t.tipo,
      asunto: t.asunto,
    })),
  });
});

// GET /api/email-templates/:id — obtener detalle de una plantilla
router.get('/:id', async (req: Request, res: Response) => {
  const template = EMAIL_TEMPLATES.find((t) => t.id === req.params.id);
  if (!template) {
    return res.status(404).json({ ok: false, error: 'Plantilla no encontrada' });
  }
  res.json({ ok: true, template });
});

export default router;
