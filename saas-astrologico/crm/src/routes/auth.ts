// ─── Rutas de Autenticación ───────────────────────────────────────────────────
import { Router, Request, Response, NextFunction } from 'express';
import { registrarOrganizacion, loginUsuario, crearUsuario } from '../services/auth.service';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/registro
 * Crea una organización nueva + su primer usuario admin.
 *
 * Body: { nombreOrg, slugOrg?, nombre, email, password }
 */
router.post('/registro', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombreOrg, slugOrg, nombre, email, password } = req.body;

    if (!nombreOrg || !nombre || !email || !password) {
      res.status(400).json({ ok: false, error: 'Faltan campos: nombreOrg, nombre, email, password' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    const resultado = await registrarOrganizacion({ nombreOrg, slugOrg, nombre, email, password });
    res.status(201).json({ ok: true, ...resultado });
  } catch (err) { next(err); }
});

/**
 * POST /api/auth/login
 * Inicia sesión. Devuelve un JWT válido por 7 días.
 *
 * Body: { email, password, slugOrg }
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, slugOrg } = req.body;

    if (!email || !password || !slugOrg) {
      res.status(400).json({ ok: false, error: 'Faltan campos: email, password, slugOrg' });
      return;
    }

    const resultado = await loginUsuario({ email, password, slugOrg });
    res.json({ ok: true, ...resultado });
  } catch (err) { next(err); }
});

/**
 * GET /api/auth/me
 * Devuelve el perfil del usuario autenticado.
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ ok: true, data: req.usuario });
});

/**
 * POST /api/auth/usuarios
 * Crea un nuevo agente dentro de la organización del admin.
 * Solo admins pueden hacerlo.
 *
 * Body: { nombre, email, password, rol? }
 */
router.post('/usuarios', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      res.status(400).json({ ok: false, error: 'Faltan campos: nombre, email, password' });
      return;
    }

    const usuario = await crearUsuario({
      nombre, email, password,
      rol: rol ?? 'agente',
      organizacionId: req.usuario!.organizacionId,
    });
    res.status(201).json({ ok: true, data: usuario });
  } catch (err) { next(err); }
});

export default router;
