// ─── Servicio: GA4 Measurement Protocol ──────────────────────────────────────
//
// Responsabilidades:
//   1. Enviar eventos de conversión a GA4 server-side via Measurement Protocol
//   2. Registrar purchase (Stripe) e calendar_booking (Calendly)
//   3. Adjuntar atribución (UTM, GCLID, lead_id, ga_client_id)
//   4. Logging robusto sin exposición de secretos
//   5. Manejo de errores sin bloquear conversión CRM

interface GA4Event {
  name: string;
  params: Record<string, unknown>;
}

interface GA4Payload {
  client_id?: string;
  user_id?: string;
  events: GA4Event[];
  timestamp_micros?: string;
}

interface SendEventResult {
  ok: boolean;
  event_name?: string;
  status?: number;
  error?: string;
  details?: Record<string, unknown>;
}

// ─── Validar configuración ────────────────────────────────────────────────────
function validateGA4Config(): { measurementId: string; apiSecret: string } | null {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn('[GA4] Configuración incompleta:', {
      hasMeasurementId: !!measurementId,
      hasApiSecret: !!apiSecret,
    });
    return null;
  }

  return { measurementId, apiSecret };
}

// ─── Enviar evento genérico a GA4 ────────────────────────────────────────────
async function sendEvent(
  eventName: string,
  eventParams: Record<string, unknown>,
  clientId?: string | null,
  userId?: string | null,
): Promise<SendEventResult> {
  const config = validateGA4Config();
  if (!config) {
    return { ok: false, error: 'GA4 no configurado', event_name: eventName };
  }

  const payload: GA4Payload = {
    events: [{ name: eventName, params: eventParams }],
  };

  // Usar client_id si está disponible (NO inventar)
  if (clientId) {
    payload.client_id = clientId;
  } else {
    console.warn(`[GA4] ${eventName}: client_id no disponible (será generado server-side)`);
  }

  // Usar user_id si está disponible (lead_id)
  if (userId) {
    payload.user_id = userId;
  }

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const isSuccess = response.ok || response.status === 204;

    if (!isSuccess) {
      const errorText = await response.text().catch(() => '');
      console.error(`[GA4] ${eventName} error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText.slice(0, 200), // Limitar log
      });

      return {
        ok: false,
        event_name: eventName,
        status: response.status,
        error: `GA4 HTTP ${response.status}`,
      };
    }

    console.log(`[GA4] ${eventName} enviado exitosamente`);
    return {
      ok: true,
      event_name: eventName,
      status: response.status,
    };
  } catch (err) {
    console.error(`[GA4] ${eventName} error de red:`, (err as Error).message);
    return {
      ok: false,
      event_name: eventName,
      error: `Error de red: ${(err as Error).message}`,
    };
  }
}

// ─── Purchase Event (Stripe) ─────────────────────────────────────────────────
export async function sendPurchaseEvent(options: {
  transactionId: string; // session.id
  value: number; // amount_total / 100
  currency: string; // "MXN"
  email?: string;
  userId?: string; // lead_id
  productId?: string; // prod_xxx
  productName?: string; // nombre del producto
  items?: { name: string; price: number; quantity: number }[];
  customParams?: Record<string, string | number | boolean | null>;
  clientId?: string | null; // ga_client_id
}): Promise<SendEventResult> {
  const params: Record<string, unknown> = {
    transaction_id: options.transactionId,
    value: options.value,
    currency: options.currency,
  };

  // Items
  if (options.items && options.items.length > 0) {
    params.items = options.items.map((item) => ({
      item_id: options.productId,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));
  } else if (options.productId && options.productName) {
    params.items = [
      {
        item_id: options.productId,
        item_name: options.productName,
        price: options.value,
        quantity: 1,
      },
    ];
  }

  // Email (si disponible)
  if (options.email) {
    params.user_email = options.email;
  }

  // Custom params (UTM, etc.)
  if (options.customParams) {
    Object.assign(params, options.customParams);
  }

  return sendEvent('purchase', params, options.clientId || null, options.userId);
}

// ─── Calendar Booking Event (Calendly) ───────────────────────────────────────
export async function sendCalendarBookingEvent(options: {
  eventId: string; // invitee.uri
  eventName: string; // nombre de sesión
  userEmail?: string;
  userId?: string; // lead_id
  scheduledTime?: string; // ISO timestamp
  customParams?: Record<string, string | number | boolean | null>;
  clientId?: string | null; // ga_client_id
}): Promise<SendEventResult> {
  const params: Record<string, unknown> = {
    event_id: options.eventId,
    event_name: options.eventName,
  };

  // Fecha agendada
  if (options.scheduledTime) {
    params.scheduled_time = options.scheduledTime;
  }

  // Email
  if (options.userEmail) {
    params.user_email = options.userEmail;
  }

  // Custom params
  if (options.customParams) {
    Object.assign(params, options.customParams);
  }

  return sendEvent('calendar_booking', params, options.clientId || null, options.userId);
}

// ─── Custom Event (genérico) ──────────────────────────────────────────────────
export async function sendCustomEvent(
  eventName: string,
  eventParams: Record<string, unknown>,
  options?: {
    clientId?: string | null;
    userId?: string;
  },
): Promise<SendEventResult> {
  return sendEvent(eventName, eventParams, options?.clientId || null, options?.userId);
}

// ─── Health check ────────────────────────────────────────────────────────────
export function isGA4Configured(): boolean {
  return validateGA4Config() !== null;
}

export function getGA4Status(): {
  configured: boolean;
  measurementId?: string;
  missingVars?: string[];
} {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  const missing: string[] = [];
  if (!measurementId) missing.push('GA4_MEASUREMENT_ID');
  if (!apiSecret) missing.push('GA4_API_SECRET');

  return {
    configured: missing.length === 0,
    measurementId: measurementId ? measurementId.slice(0, 5) + '...' : undefined,
    missingVars: missing.length > 0 ? missing : undefined,
  };
}
