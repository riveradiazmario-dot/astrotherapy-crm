// ─── Rutas SMTP Config — gestión de cuentas SMTP ─────────────────────────────
import { Router, Request, Response } from 'express';
import {
  listarSmtpConfigs,
  crearSmtpConfig,
  actualizarSmtpConfig,
  eliminarSmtpConfig,
  marcarPredeterminado,
} from '../services/smtp-config.service';

const router = Router();

// ─── GET /api/smtp-config — listar todas (sin password) ──────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const configs = await listarSmtpConfigs();
    return res.json(configs);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ─── POST /api/smtp-config — crear nueva config ───────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { nombre, tipo, api_key, host, port, secure, usuario, password, fromEmail, fromNombre, activo, predeterminado } = req.body;

  if (!nombre || !fromEmail) {
    return res.status(400).json({ error: 'Faltan campos: nombre, fromEmail' });
  }
  if (tipo === 'resend' && !api_key) {
    return res.status(400).json({ error: 'Resend requiere api_key' });
  }
  if ((!tipo || tipo === 'smtp') && (!host || !usuario || !password)) {
    return res.status(400).json({ error: 'SMTP requiere host, usuario, password' });
  }

  try {
    const config = await crearSmtpConfig({
      nombre,
      tipo: tipo ?? 'smtp',
      api_key: api_key ?? undefined,
      host: host ?? undefined,
      port: port ?? 465,
      secure: secure ?? true,
      usuario: usuario ?? undefined,
      password: password ?? undefined,
      fromEmail,
      fromNombre: fromNombre ?? 'AstroTherapy Pro',
      activo: activo ?? true,
      predeterminado: predeterminado ?? false,
      organizacionId: 'org-luz-holistica',
    });
    // No devolver password
    const { password: _, ...sinPassword } = config;
    return res.status(201).json(sinPassword);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ─── PUT /api/smtp-config/:id — actualizar config ────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const config = await actualizarSmtpConfig(req.params.id, req.body);
    const { password: _, ...sinPassword } = config;
    return res.json(sinPassword);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ─── DELETE /api/smtp-config/:id — eliminar config ───────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await eliminarSmtpConfig(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ─── POST /api/smtp-config/:id/predeterminado — marcar como predeterminado ───
router.post('/:id/predeterminado', async (req: Request, res: Response) => {
  try {
    await marcarPredeterminado(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
