// ─── Rutas de email / SMTP ────────────────────────────────────────────────────
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  verificarConexionSmtp,
  enviarEmail,
  enviarCampana,
  templates,
} from '../services/smtp.service';

const router = Router();
const prisma = new PrismaClient();

// ─── POST /api/email/lead-bienvenida — llamado por Edge Function o triggers ───
// Acepta { nombre, email } directamente (sin requerir contactoId)
// Toda la lógica de proveedor vive en smtp.service → provider.factory
router.post('/lead-bienvenida', async (req: Request, res: Response) => {
  const { nombre, email } = req.body as { nombre?: string; email: string };
  if (!email) return res.status(400).json({ ok: false, error: 'email requerido' });

  const resultado = await enviarEmail({
    para: email,
    asunto: `¡Hola ${nombre ?? 'colega'}! Tu demo de AstroTherapy Pro te espera 🌟`,
    html: templates.bienvenida(nombre ?? 'colega'),
  });

  return res.status(resultado.ok ? 200 : 500).json({ ...resultado, lead_guardado: true });
});

// ─── GET /api/email/estado — verificar conexión SMTP ─────────────────────────
router.get('/estado', async (_req: Request, res: Response) => {
  const resultado = await verificarConexionSmtp();
  res.status(resultado.ok ? 200 : 503).json(resultado);
});

// ─── POST /api/email/prueba — enviar email de prueba ─────────────────────────
router.post('/prueba', async (req: Request, res: Response) => {
  const { para, asunto, html } = req.body as {
    para: string;
    asunto?: string;
    html?: string;
  };

  if (!para) {
    return res.status(400).json({ error: 'El campo "para" es requerido' });
  }

  const resultado = await enviarEmail({
    para,
    asunto: asunto ?? 'Prueba SMTP — AstroTherapy Pro',
    html: html ?? '<p>Este es un correo de prueba desde el CRM de AstroTherapy Pro.</p>',
  });

  return res.status(resultado.ok ? 200 : 500).json(resultado);
});

// ─── POST /api/email/enviar — enviar email a uno o varios contactos ───────────
router.post('/enviar', async (req: Request, res: Response) => {
  const { para, asunto, html, cc, cco } = req.body as {
    para: string | string[];
    asunto: string;
    html: string;
    cc?: string | string[];
    cco?: string | string[];
  };

  if (!para || !asunto || !html) {
    return res.status(400).json({ error: 'Faltan campos: para, asunto, html' });
  }

  const resultado = await enviarEmail({ para, asunto, html, cc, cco });
  return res.status(resultado.ok ? 200 : 500).json(resultado);
});

// ─── POST /api/email/campana — envío masivo a segmento de contactos ───────────
router.post('/campana', async (req: Request, res: Response) => {
  const { asunto, html, segmento, pausaMs } = req.body as {
    asunto: string;
    html: string;
    segmento?: {
      estado?: string;
      especialidad?: string;
      etiqueta?: string;
    };
    pausaMs?: number;
  };

  if (!asunto || !html) {
    return res.status(400).json({ error: 'Faltan campos: asunto, html' });
  }

  // Construir filtro dinámico
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { consentimientoEmail: true };
  if (segmento?.estado) where.estado = segmento.estado;
  if (segmento?.especialidad) where.especialidadPrimaria = segmento.especialidad;
  if (segmento?.etiqueta) where.etiquetas = { contains: segmento.etiqueta };

  const contactos = await prisma.contacto.findMany({
    where,
    select: { email: true, nombre: true },
  });

  if (contactos.length === 0) {
    return res.status(200).json({
      mensaje: 'No hay contactos que cumplan el segmento seleccionado',
      total: 0,
    });
  }

  const resultado = await enviarCampana(
    contactos.map((c) => ({ email: c.email ?? '', nombre: c.nombre ?? '' })).filter((c) => c.email),
    asunto,
    html,
    pausaMs ?? 500
  );

  return res.json(resultado);
});

// ─── POST /api/email/bienvenida/:contactoId — email de bienvenida ─────────────
router.post('/bienvenida/:contactoId', async (req: Request, res: Response) => {
  const { contactoId } = req.params;

  const contacto = await prisma.contacto.findUnique({
    where: { id: contactoId },
  });

  if (!contacto) {
    return res.status(404).json({ error: 'Contacto no encontrado' });
  }
  if (!contacto.email) {
    return res.status(400).json({ error: 'El contacto no tiene email registrado' });
  }

  const resultado = await enviarEmail({
    para: contacto.email,
    asunto: '¡Bienvenido/a a AstroTherapy Pro! 🌟',
    html: templates.bienvenida(contacto.nombre ?? 'Colega'),
  });

  return res.status(resultado.ok ? 200 : 500).json(resultado);
});

// ─── POST /api/email/seguimiento/:contactoId — email de seguimiento ───────────
router.post('/seguimiento/:contactoId', async (req: Request, res: Response) => {
  const { contactoId } = req.params;

  const contacto = await prisma.contacto.findUnique({
    where: { id: contactoId },
  });

  if (!contacto) {
    return res.status(404).json({ error: 'Contacto no encontrado' });
  }
  if (!contacto.email) {
    return res.status(400).json({ error: 'El contacto no tiene email registrado' });
  }

  const resultado = await enviarEmail({
    para: contacto.email,
    asunto: '¿Seguimos en contacto? — AstroTherapy Pro',
    html: templates.seguimiento(contacto.nombre ?? 'Colega'),
  });

  return res.status(resultado.ok ? 200 : 500).json(resultado);
});

export default router;
