// ─── Rutas para formularios del sitio web ────────────────────────────────────
// Recibe datos de formularios de luzholistica.com.mx y crea leads en el CRM

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { crearContacto } from '../services/contacto.service';
import { asignarContactoAutomatico } from '../services/lead-routing.service';
import { CrearContactoDTO } from '../types';

const router = Router();
const prisma = new PrismaClient();

// Constante: ID de organización para formularios del sitio web
// En producción, se puede hacer multi-tenant si es necesario
const ORG_ID_SITIO_WEB = process.env.ORG_ID_SITIO_WEB || 'default';

// ─── POST /api/web-forms/contacto ─────────────────────────────────────────────

/**
 * Recibe datos del formulario de contacto del sitio web.
 * Crea un nuevo contacto en el CRM automáticamente.
 *
 * Body:
 * {
 *   nombre: string,
 *   email: string,
 *   telefono?: string,
 *   interes?: "astrologia" | "tarot" | "reiki" | "constelaciones" | "biodescodificacion" | "formacion" | "membresia" | "otro",
 *   mensaje?: string,
 *   fuente: string (origen: "home", "consultas", "formacion", etc)
 * }
 */
router.post('/contacto', [
  body('email').isEmail().withMessage('Email inválido'),
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
  body('fuente').optional().trim(),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validar
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      res.status(400).json({ ok: false, errores: errores.array() });
      return;
    }

    const { nombre, email, telefono, interes, mensaje, fuente = 'sitio_web' } = req.body as {
      nombre: string;
      email: string;
      telefono?: string;
      interes?: string;
      mensaje?: string;
      fuente?: string;
    };

    // Mapear interés a especialidad
    const especialidadMap: Record<string, string> = {
      astrologia: 'astrologia_tropical',
      tarot: 'tarot',
      reiki: 'reiki',
      constelaciones: 'constelaciones_familiares',
      biodescodificacion: 'otro',
      formacion: 'otro',
      membresia: 'otro',
      otro: 'otro',
    };

    const especialidad = interes ? especialidadMap[interes] || 'otro' : 'otro';

    // Verificar si ya existe
    const existente = await prisma.contacto.findFirst({
      where: {
        email: email.toLowerCase(),
        organizacionId: ORG_ID_SITIO_WEB,
      },
    });

    if (existente) {
      // Si ya existe, actualizar con la nueva información
      await prisma.contacto.update({
        where: { id: existente.id },
        data: {
          nombre: nombre || existente.nombre,
          telefono: telefono || existente.telefono,
          notas: mensaje ? `${existente.notas || ''}\n\n[${new Date().toISOString()}] ${mensaje}` : existente.notas,
        },
      });

      return res.json({
        ok: true,
        mensaje: 'Gracias por contactarnos. Ya tienes un registro con nosotros y nos pondremos en contacto pronto.',
        contactoId: existente.id,
      });
    }

    // Crear nuevo contacto
    const dto: CrearContactoDTO = {
      nombre,
      email,
      telefono: telefono || undefined,
      especialidadPrimaria: especialidad as any,
      fuente: `${fuente}_${interes || 'general'}` as any,
      notas: mensaje ? `Consulta desde sitio web\n\n${mensaje}` : 'Consulta desde sitio web',
      etiquetas: interes ? [interes] : [],
      consentimientoEmail: true, // Aceptaron privacidad al enviar formulario
      fuenteConsentimiento: 'formulario_sitio_web',
    };

    const contacto = await crearContacto(dto, ORG_ID_SITIO_WEB);

    // Logging
    console.log(`[Web Form] Nuevo contacto creado: ${contacto.email} (${interes || 'sin especificar'})`);

    // Lead routing automático
    try {
      const routing = await asignarContactoAutomatico(contacto, ORG_ID_SITIO_WEB);
      if (routing.asignado) {
        console.log(`[Lead Routing] ${contacto.email} → ${routing.agente}`);
      }
    } catch (err) {
      console.warn('Error en lead routing:', err);
    }

    res.json({
      ok: true,
      mensaje: 'Gracias por contactarnos. Nos pondremos en contacto contigo pronto.',
      contactoId: contacto.id,
    });
  } catch (err) { next(err); }
});

// ─── GET /api/web-forms/intereses ─────────────────────────────────────────────

/**
 * Retorna opciones de interés disponibles para los formularios.
 * Útil para sincronizar el frontend con opciones válidas.
 */
router.get('/intereses', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    intereses: [
      { id: 'astrologia', nombre: 'Astrología Terapéutica', icono: '⭐' },
      { id: 'tarot', nombre: 'Tarot Terapéutico', icono: '🃏' },
      { id: 'reiki', nombre: 'Reiki y Sanación Energética', icono: '✨' },
      { id: 'constelaciones', nombre: 'Constelaciones Familiares', icono: '🌍' },
      { id: 'biodescodificacion', nombre: 'Biodescodificación', icono: '🧬' },
      { id: 'formacion', nombre: 'Formación / Cursos', icono: '📚' },
      { id: 'membresia', nombre: 'Membresía', icono: '👥' },
      { id: 'otro', nombre: 'Otro', icono: '❓' },
    ],
  });
});

// ─── GET /api/web-forms/stats ─────────────────────────────────────────────────

/**
 * Estadísticas de leads desde formularios web.
 */
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await prisma.contacto.groupBy({
      by: ['fuente'],
      where: { organizacionId: ORG_ID_SITIO_WEB },
      _count: true,
    });

    const formularioStats = stats
      .filter(s => s.fuente?.includes('sitio_web'))
      .reduce((acc, s) => {
        const [fuente, tipo] = (s.fuente || '').split('_');
        if (!acc[tipo]) acc[tipo] = 0;
        acc[tipo] += s._count;
        return acc;
      }, {} as Record<string, number>);

    res.json({
      ok: true,
      data: {
        totalDesdeFormularios: Object.values(formularioStats).reduce((a, b) => a + b, 0),
        porInterés: formularioStats,
      },
    });
  } catch (err) { next(err); }
});

export default router;
