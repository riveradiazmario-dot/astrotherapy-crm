// ─── Rutas: Integración Calendly ────────────────────────────────────────────
import { Router, Request, Response } from 'express';
import {
  syncCalendlyBooking,
  syncCalendlyCancellation,
  CALENDLY_SLUG_MAP,
  CalendlyEvent,
  CalendlyInvitee,
} from '../services/calendly.service';

const router = Router();

// ─── POST /api/calendly/webhook ─────────────────────────────────────────────
// Receptor de webhooks de Calendly (invitee.created / invitee.canceled)
// Configurar en Calendly → Webhooks → URL: https://CRM_URL/api/calendly/webhook
router.post('/webhook', async (req: Request, res: Response) => {
  const { event: eventType, payload } = req.body as {
    event: string;
    payload: {
      event: CalendlyEvent;
      invitee: CalendlyInvitee;
      event_type?: { slug?: string };
    };
  };

  if (!payload?.event || !payload?.invitee) {
    return res.status(400).json({ error: 'Payload incompleto' });
  }

  const slug = payload.event_type?.slug ?? '';

  try {
    let resultado;

    if (eventType === 'invitee.created') {
      resultado = await syncCalendlyBooking(payload.event, payload.invitee, slug);
    } else if (eventType === 'invitee.canceled') {
      resultado = await syncCalendlyCancellation(payload.event, payload.invitee);
    } else {
      return res.json({ ok: true, ignored: true, event: eventType });
    }

    return res.json(resultado);
  } catch (err) {
    console.error('[Calendly webhook] Error:', err);
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── POST /api/calendly/sync-manual ─────────────────────────────────────────
// Sync manual de un booking (para testing o importar históricos)
router.post('/sync-manual', async (req: Request, res: Response) => {
  const { event, invitee, eventTypeSlug } = req.body as {
    event: CalendlyEvent;
    invitee: CalendlyInvitee;
    eventTypeSlug?: string;
  };

  if (!event || !invitee) {
    return res.status(400).json({ error: 'event e invitee son requeridos' });
  }

  try {
    const resultado = await syncCalendlyBooking(event, invitee, eventTypeSlug);
    return res.json(resultado);
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── GET /api/calendly/event-types ──────────────────────────────────────────
// Devuelve el mapeo de slugs Calendly → etiquetas CRM
router.get('/event-types', (_req, res: Response) => {
  return res.json({
    mapeo: CALENDLY_SLUG_MAP,
    nota: 'Cada slug de Calendly se mapea a una etiqueta del CRM para segmentación',
  });
});

export default router;
