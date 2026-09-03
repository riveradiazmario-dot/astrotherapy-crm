// ─── Servicio: Conversion Events Tracking ────────────────────────────────────
//
// Responsabilidades:
//   1. Rastrear eventos de conversión con idempotencia ÚNICA(event_id, event_type)
//   2. Mantener state machine robusto a fallos parciales
//   3. Permitir reintentos independientes de GA4 y Meta
//   4. Proteger contra race conditions (2 webhooks simultáneos)

import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getSupabase(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY no configurada');
  return createClient(process.env.SUPABASE_URL!, key);
}

// ─── Tipos ──────────────────────────────────────────────────────────────────
export interface ConversionEvent {
  id: string;
  event_id: string; // session.id | invitee.uri
  event_type: 'stripe_purchase' | 'calendly_booking';
  contacto_id?: string;
  email: string;
  ga4_status: 'pending' | 'sent' | 'failed' | 'timeout';
  ga4_attempts: number;
  ga4_last_error?: string;
  ga4_sent_at?: string;
  meta_status: 'pending' | 'sent' | 'failed' | 'timeout';
  meta_attempts: number;
  meta_last_error?: string;
  meta_sent_at?: string;
  state: 'received' | 'processing' | 'completed' | 'error';
  created_at: string;
  last_attempt_at?: string;
  completed_at?: string;
}

// ─── CREAR O ACTUALIZAR EVENTO DE CONVERSIÓN ─────────────────────────────────
// Protegido contra race condition: usa ON CONFLICT
export async function upsertConversionEvent(
  eventId: string,
  eventType: 'stripe_purchase' | 'calendly_booking',
  email: string,
  contactoId?: string,
): Promise<ConversionEvent> {
  const sb = getSupabase();

  try {
    const { data, error } = await sb
      .from('conversion_events')
      .upsert(
        {
          event_id: eventId,
          event_type: eventType,
          email,
          contacto_id: contactoId,
          state: 'received',
          ga4_status: 'pending',
          meta_status: 'pending',
        },
        {
          onConflict: 'event_id,event_type', // ON CONFLICT (event_id, event_type)
        },
      )
      .select()
      .single();

    if (error) throw error;
    return data as ConversionEvent;
  } catch (err) {
    console.error('[ConversionEvents] Error upserting:', (err as Error).message);
    throw err;
  }
}

// ─── ACTUALIZAR ESTADO GA4 ──────────────────────────────────────────────────
export async function updateGA4Status(
  eventId: string,
  eventType: 'stripe_purchase' | 'calendly_booking',
  status: 'sent' | 'failed' | 'timeout',
  error?: string,
  response?: Record<string, unknown>,
): Promise<ConversionEvent> {
  const sb = getSupabase();

  try {
    const { data, error: dbError } = await sb
      .from('conversion_events')
      .update({
        ga4_status: status,
        ga4_last_error: error,
        ga4_response: response,
        ga4_sent_at: status === 'sent' ? new Date().toISOString() : null,
        ga4_attempts: { increment: 1 }, // Incrementar contador
        last_attempt_at: new Date().toISOString(),
        state: status === 'sent' ? 'processing' : 'error', // Cambiar state si es necesario
      })
      .eq('event_id', eventId)
      .eq('event_type', eventType)
      .select()
      .single();

    if (dbError) throw dbError;
    return data as ConversionEvent;
  } catch (err) {
    console.error('[ConversionEvents] Error updating GA4:', (err as Error).message);
    throw err;
  }
}

// ─── ACTUALIZAR ESTADO META ─────────────────────────────────────────────────
export async function updateMetaStatus(
  eventId: string,
  eventType: 'stripe_purchase' | 'calendly_booking',
  status: 'sent' | 'failed' | 'timeout',
  error?: string,
  response?: Record<string, unknown>,
): Promise<ConversionEvent> {
  const sb = getSupabase();

  try {
    const { data, error: dbError } = await sb
      .from('conversion_events')
      .update({
        meta_status: status,
        meta_last_error: error,
        meta_response: response,
        meta_sent_at: status === 'sent' ? new Date().toISOString() : null,
        meta_attempts: { increment: 1 }, // Incrementar contador
        last_attempt_at: new Date().toISOString(),
        state: status === 'sent' ? 'processing' : 'error', // Cambiar state si es necesario
      })
      .eq('event_id', eventId)
      .eq('event_type', eventType)
      .select()
      .single();

    if (dbError) throw dbError;
    return data as ConversionEvent;
  } catch (err) {
    console.error('[ConversionEvents] Error updating Meta:', (err as Error).message);
    throw err;
  }
}

// ─── MARCAR COMO COMPLETADO ─────────────────────────────────────────────────
export async function markCompleted(
  eventId: string,
  eventType: 'stripe_purchase' | 'calendly_booking',
): Promise<ConversionEvent> {
  const sb = getSupabase();

  try {
    const { data, error } = await sb
      .from('conversion_events')
      .update({
        state: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('event_type', eventType)
      .eq('ga4_status', 'sent') // Solo si GA4 fue enviado
      .eq('meta_status', 'sent') // Y Meta fue enviado
      .select()
      .single();

    if (error) throw error;
    return data as ConversionEvent;
  } catch (err) {
    console.error('[ConversionEvents] Error marking completed:', (err as Error).message);
    throw err;
  }
}

// ─── OBTENER EVENTO ──────────────────────────────────────────────────────────
export async function getConversionEvent(
  eventId: string,
  eventType: 'stripe_purchase' | 'calendly_booking',
): Promise<ConversionEvent | null> {
  const sb = getSupabase();

  try {
    const { data, error } = await sb
      .from('conversion_events')
      .select()
      .eq('event_id', eventId)
      .eq('event_type', eventType)
      .single();

    if (error && error.code === 'PGRST116') return null; // Not found
    if (error) throw error;
    return data as ConversionEvent;
  } catch (err) {
    console.error('[ConversionEvents] Error getting:', (err as Error).message);
    throw err;
  }
}

// ─── DETERMINAR QUÉ ENVIAR (GA4 / META) ──────────────────────────────────────
export async function getDestinationsToProcees(
  eventId: string,
  eventType: 'stripe_purchase' | 'calendly_booking',
): Promise<{ sendToGA4: boolean; sendToMeta: boolean }> {
  const event = await getConversionEvent(eventId, eventType);

  if (!event) {
    // Primera vez: enviar a ambos
    return { sendToGA4: true, sendToMeta: true };
  }

  // Reintento: enviar solo los pendientes
  return {
    sendToGA4: event.ga4_status === 'pending' || event.ga4_status === 'failed' || event.ga4_status === 'timeout',
    sendToMeta: event.meta_status === 'pending' || event.meta_status === 'failed' || event.meta_status === 'timeout',
  };
}

// ─── VERIFICAR SI DEBE REINTENTAR (max 3 intentos por destino) ────────────────
export function canRetry(attempts: number, maxAttempts: number = 3): boolean {
  return attempts < maxAttempts;
}

// ─── HELPER: SANITIZAR ERROR PARA LOGGING (sin exponer URLs/secrets) ────────
export function sanitizeErrorForLogging(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  // No loguear URLs que puedan contener secrets
  if (msg.includes('https://') || msg.includes('?')) {
    return 'HTTP error (URL truncated for security)';
  }
  return msg.slice(0, 200); // Truncar a 200 chars
}
