// ─── Rutas: Integración Stripe ──────────────────────────────────────────────
import { Router, Request, Response } from 'express';
import {
  syncCheckoutCompleted,
  syncSubscriptionCancelled,
  STRIPE_PRODUCT_MAP,
  StripeCheckoutSession,
} from '../services/stripe.service';

const router = Router();

// ─── POST /api/stripe/webhook ───────────────────────────────────────────────
// Receptor de webhooks de Stripe
// Configurar en Stripe Dashboard → Webhooks → URL: https://CRM_URL/api/stripe/webhook
// Eventos a suscribir: checkout.session.completed, customer.subscription.deleted
router.post('/webhook', async (req: Request, res: Response) => {
  // Nota: en producción se debe verificar la firma del webhook con STRIPE_WEBHOOK_SECRET
  // Por ahora, para LOCAL_DEV, procesamos directamente.
  const event = req.body as { type: string; data: { object: Record<string, unknown> } };

  if (!event?.type || !event?.data?.object) {
    return res.status(400).json({ error: 'Payload de Stripe incompleto' });
  }

  try {
    let resultado;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as unknown as StripeCheckoutSession;
        resultado = await syncCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as { customer_email?: string; items?: { data?: { price?: { product?: string } }[] } };
        const email = sub.customer_email ?? '';
        const productId = sub.items?.data?.[0]?.price?.product as string | undefined;
        resultado = await syncSubscriptionCancelled(email, productId);
        break;
      }
      default:
        return res.json({ ok: true, ignored: true, event: event.type });
    }

    return res.json(resultado);
  } catch (err) {
    console.error('[Stripe webhook] Error:', err);
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── POST /api/stripe/sync-manual ───────────────────────────────────────────
// Sync manual de un checkout (testing / importar históricos)
router.post('/sync-manual', async (req: Request, res: Response) => {
  const session = req.body as StripeCheckoutSession;
  if (!session?.id) return res.status(400).json({ error: 'session es requerido' });

  try {
    const resultado = await syncCheckoutCompleted(session);
    return res.json(resultado);
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── GET /api/stripe/products ───────────────────────────────────────────────
// Devuelve el mapeo de productos Stripe → etiquetas CRM
router.get('/products', (_req, res: Response) => {
  const productos = Object.entries(STRIPE_PRODUCT_MAP).map(([id, p]) => ({
    product_id: id,
    ...p,
  }));
  return res.json({ productos, total: productos.length });
});

export default router;
