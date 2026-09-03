// ─── Servicio: Meta Conversions API ──────────────────────────────────────────
//
// Responsabilidades:
//   1. Enviar eventos de conversión a Meta Conversions API
//   2. Registrar Purchase (Stripe) e Schedule (Calendly)
//   3. Adjuntar atribución (fbclid, lead_id, email)
//   4. Hashing de PII (email, phone)
//   5. Logging robusto sin exposición de secretos

import crypto from 'crypto';

interface MetaUserData {
  em?: string; // hashed email
  ph?: string; // hashed phone
  madid?: string; // mobile advertising id (lead_id)
  fclid?: string; // facebook click id
  fbp?: string; // facebook pixel cookie
  fbc?: string; // first-party container cookie
  external_id?: string; // external user id (lead_id)
}

interface MetaCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_type?: string;
  content_id?: string;
  [key: string]: unknown;
}

interface MetaEventData {
  event_id: string;
  event_name: string;
  event_time: number;
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
  opt_out?: boolean;
}

interface SendEventResult {
  ok: boolean;
  event_name?: string;
  status?: number;
  error?: string;
  response?: Record<string, unknown>;
}

// ─── Hash PII (SHA-256) ───────────────────────────────────────────────────────
function hashPII(value: string): string {
  if (!value) return '';
  return crypto
    .createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex');
}

// ─── Validar configuración ────────────────────────────────────────────────────
function validateMetaConfig(): { pixelId: string; accessToken: string; apiVersion: string } | null {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const apiVersion = process.env.META_GRAPH_API_VERSION || 'v18.0';

  if (!pixelId || !accessToken) {
    console.warn('[Meta] Configuración incompleta:', {
      hasPixelId: !!pixelId,
      hasAccessToken: !!accessToken,
    });
    return null;
  }

  return { pixelId, accessToken, apiVersion };
}

// ─── Enviar evento a Meta ─────────────────────────────────────────────────────
async function sendEvent(eventData: MetaEventData): Promise<SendEventResult> {
  const config = validateMetaConfig();
  if (!config) {
    return { ok: false, error: 'Meta no configurado', event_name: eventData.event_name };
  }

  const payload = {
    data: [eventData],
    // test_event_code: "TEST_CODE", // Descomentar si está en test
  };

  const url = `https://graph.instagram.com/${config.apiVersion}/${config.pixelId}/events`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const isSuccess = response.ok;

    if (!isSuccess) {
      const errorText = await response.text().catch(() => '');
      console.error(`[Meta] ${eventData.event_name} error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText.slice(0, 200),
      });

      return {
        ok: false,
        event_name: eventData.event_name,
        status: response.status,
        error: `Meta HTTP ${response.status}`,
      };
    }

    const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    console.log(`[Meta] ${eventData.event_name} enviado exitosamente`);
    return {
      ok: true,
      event_name: eventData.event_name,
      status: response.status,
      response: result,
    };
  } catch (err) {
    console.error(`[Meta] ${eventData.event_name} error de red:`, (err as Error).message);
    return {
      ok: false,
      event_name: eventData.event_name,
      error: `Error de red: ${(err as Error).message}`,
    };
  }
}

// ─── Purchase Event (Stripe) ──────────────────────────────────────────────────
export async function sendPurchaseEvent(options: {
  eventId: string; // session.id
  value: number; // amount_total / 100
  currency: string; // "MXN"
  contentName?: string; // nombre del producto
  contentId?: string; // prod_xxx
  userEmail?: string;
  userId?: string; // lead_id
  fbclid?: string;
  fbp?: string;
  fbc?: string;
}): Promise<SendEventResult> {
  const userData: MetaUserData = {
    external_id: options.userId,
    madid: options.userId,
  };

  // Email (hasheado)
  if (options.userEmail) {
    userData.em = hashPII(options.userEmail);
  }

  // Click IDs
  if (options.fbclid) {
    userData.fclid = options.fbclid;
  }
  if (options.fbp) {
    userData.fbp = options.fbp;
  }
  if (options.fbc) {
    userData.fbc = options.fbc;
  }

  const customData: MetaCustomData = {
    value: options.value,
    currency: options.currency,
    content_type: 'product',
  };

  if (options.contentName) {
    customData.content_name = options.contentName;
  }
  if (options.contentId) {
    customData.content_id = options.contentId;
  }

  const eventData: MetaEventData = {
    event_id: options.eventId,
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    user_data: userData,
    custom_data: customData,
  };

  return sendEvent(eventData);
}

// ─── Schedule Event (Calendly) ────────────────────────────────────────────────
export async function sendScheduleEvent(options: {
  eventId: string; // invitee.uri
  contentName?: string; // nombre de sesión
  userEmail?: string;
  userId?: string; // lead_id
  fbclid?: string;
  fbp?: string;
  fbc?: string;
}): Promise<SendEventResult> {
  const userData: MetaUserData = {
    external_id: options.userId,
    madid: options.userId,
  };

  // Email (hasheado)
  if (options.userEmail) {
    userData.em = hashPII(options.userEmail);
  }

  // Click IDs
  if (options.fbclid) {
    userData.fclid = options.fbclid;
  }
  if (options.fbp) {
    userData.fbp = options.fbp;
  }
  if (options.fbc) {
    userData.fbc = options.fbc;
  }

  const customData: MetaCustomData = {
    content_type: 'service',
  };

  if (options.contentName) {
    customData.content_name = options.contentName;
  }

  const eventData: MetaEventData = {
    event_id: options.eventId,
    event_name: 'Schedule',
    event_time: Math.floor(Date.now() / 1000),
    user_data: userData,
    custom_data: customData,
  };

  return sendEvent(eventData);
}

// ─── Custom Event ─────────────────────────────────────────────────────────────
export async function sendCustomEvent(options: {
  eventId: string;
  eventName: string;
  userData?: MetaUserData;
  customData?: MetaCustomData;
}): Promise<SendEventResult> {
  const eventData: MetaEventData = {
    event_id: options.eventId,
    event_name: options.eventName,
    event_time: Math.floor(Date.now() / 1000),
    user_data: options.userData || {},
    custom_data: options.customData,
  };

  return sendEvent(eventData);
}

// ─── Health check ─────────────────────────────────────────────────────────────
export function isMetaConfigured(): boolean {
  return validateMetaConfig() !== null;
}

export function getMetaStatus(): {
  configured: boolean;
  pixelId?: string;
  missingVars?: string[];
} {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  const missing: string[] = [];
  if (!pixelId) missing.push('META_PIXEL_ID');
  if (!accessToken) missing.push('META_ACCESS_TOKEN');

  return {
    configured: missing.length === 0,
    pixelId: pixelId ? pixelId.slice(0, 5) + '...' : undefined,
    missingVars: missing.length > 0 ? missing : undefined,
  };
}
