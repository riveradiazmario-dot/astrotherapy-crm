// ─── Rutas de Contactos (multi-tenant) ───────────────────────────────────────
import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import {
  crearContacto,
  obtenerContacto,
  listarContactos,
  actualizarContacto,
  eliminarContacto,
  estadisticasGenerales,
  obtenerSegmento,
} from '../services/contacto.service';
import { registrarAccion } from '../services/scoring.service';
import { requireAuth } from '../middleware/auth';
import { FiltrosContacto, TipoAccion } from '../types';

const router = Router();

// Todas las rutas de contactos requieren autenticación
router.use(requireAuth);

const validarCreacion = [
  body('email').isEmail().withMessage('Email inválido'),
  body('especialidadPrimaria').optional().isString(),
  body('nivelExperiencia').optional().isIn(['principiante', 'intermedio', 'avanzado', 'profesional']),
  body('pais').optional().isLength({ min: 2, max: 3 }),
];

function manejarErroresValidacion(req: Request, res: Response, next: NextFunction): void {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    res.status(400).json({ ok: false, errores: errores.array() });
    return;
  }
  next();
}

// GET /api/contactos — Listar con filtros y paginación
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizacionId = req.usuario!.organizacionId;
    const filtros: FiltrosContacto = {
      especialidad: req.query.especialidad as string,
      nivel: req.query.nivel as string,
      pais: req.query.pais as string,
      estado: req.query.estado as string,
      minScore: req.query.minScore ? Number(req.query.minScore) : undefined,
      maxScore: req.query.maxScore ? Number(req.query.maxScore) : undefined,
      etiqueta: req.query.etiqueta as string,
      fuente: req.query.fuente as string,
      busqueda: req.query.busqueda as string,
      conConsentimiento: req.query.conConsentimiento === 'true' ? true
        : req.query.conConsentimiento === 'false' ? false : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Math.min(Number(req.query.limit), 200) : 50,
      ordenarPor: req.query.ordenarPor as string || 'createdAt',
      orden: (req.query.orden as 'asc' | 'desc') || 'desc',
    };
    const resultado = await listarContactos(filtros, organizacionId);
    res.json(resultado);
  } catch (err) { next(err); }
});

// GET /api/contactos/stats — Estadísticas generales
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await estadisticasGenerales(req.usuario!.organizacionId);
    res.json({ ok: true, data: stats });
  } catch (err) { next(err); }
});

// GET /api/contactos/segmento/:nombre — Obtener segmento predefinido
router.get('/segmento/:nombre', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contactos = await obtenerSegmento(req.params.nombre, req.usuario!.organizacionId);
    res.json({ ok: true, data: contactos, total: contactos.length });
  } catch (err) { next(err); }
});

// GET /api/contactos/:id — Obtener uno
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contacto = await obtenerContacto(req.params.id, req.usuario!.organizacionId);
    res.json({ ok: true, data: contacto });
  } catch (err) { next(err); }
});

// POST /api/contactos — Crear nuevo
router.post('/', validarCreacion, manejarErroresValidacion, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contacto = await crearContacto(req.body, req.usuario!.organizacionId);
    res.status(201).json({ ok: true, data: contacto, mensaje: 'Contacto creado correctamente' });
  } catch (err) { next(err); }
});

// PUT /api/contactos/:id — Actualizar
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contacto = await actualizarContacto(req.params.id, req.body, req.usuario!.organizacionId);
    res.json({ ok: true, data: contacto, mensaje: 'Contacto actualizado' });
  } catch (err) { next(err); }
});

// DELETE /api/contactos/:id — Eliminar
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await eliminarContacto(req.params.id, req.usuario!.organizacionId);
    res.json({ ok: true, mensaje: 'Contacto eliminado' });
  } catch (err) { next(err); }
});

// POST /api/contactos/:id/accion — Registrar una acción y actualizar score
router.post('/:id/accion', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tipo, descripcion } = req.body as { tipo: TipoAccion; descripcion?: string };
    if (!tipo) { res.status(400).json({ ok: false, error: 'El campo tipo es requerido' }); return; }
    // Verificar que el contacto pertenece a la org antes de registrar acción
    await obtenerContacto(req.params.id, req.usuario!.organizacionId);
    const resultado = await registrarAccion(req.params.id, tipo, descripcion);
    res.json({ ok: true, data: resultado });
  } catch (err) { next(err); }
});

export default router;
