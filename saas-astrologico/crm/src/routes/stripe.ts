// ─── Rutas: Integración Stripe ──────────────────────────────────────────────
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  syncCheckoutCompleted,
  syncSubscriptionCancelled,
  STRIPE_PRODUCT_MAP,
  StripeCheckoutSession,
} from '../services/stripe.service';

const router = Router();

// ─── Verificación de firma Stripe ───────────────────────────────────────────
function verificarFirmaStripe(payload: Buffer, signature: string, secret: string): boolean {
  try {
    const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.split('=');
      acc[k] = v;
      return acc;
    }, {});
    const timestamp = parts['t'];
    const sig = parts['v1'];
    if (!timestamp || !sig) return false;
    const signed = `${timestamp}.${payload.toString('utf8')}`;
    const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

// ─── POST /api/stripe/webhook ───────────────────────────────────────────────
router.post('/webhook', async (req: Request, res: Response) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'] as string;

  // En producción: verificar firma. En LOCAL_DEV: saltar verificación.
  if (webhookSecret && signature) {
    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({ error: 'Raw body requerido para verificación de firma' });
    }
    if (!verificarFirmaStripe(rawBody, signature, webhookSecret)) {
      return res.status(401).json({ error: 'Firma inválida' });
    }
  }

  const event = (webhookSecret && signature && Buffer.isBuffer(req.body))
    ? JSON.parse(req.body.toString('utf8')) as { type: string; data: { object: Record<string, unknown> } }
    : req.body as { type: string; data: { object: Record<string, unknown> } };

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
