// ─── Servicio Calendly ──────────────────────────────────────────────────────
//
// Responsabilidades:
//   1. Sincronizar eventos agendados → tabla Contacto del CRM
//   2. Mapear event_type a tipo de servicio
//   3. Disparar eventos al motor de automatizaciones
//
// No implementa polling: la sincronización se dispara via webhook (ruta) o
// llamada manual desde la API.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { dispatchEvento } from './automations/engine';
import * as GA4 from './ga4.service';
import * as Meta from './meta.service';

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_KEY no configurada');
    _supabase = createClient(process.env.SUPABASE_URL!, key);
  }
  return _supabase;
}

// ─── Mapeo de slugs Calendly → etiquetas CRM ───────────────────────────────
const SLUG_TO_SERVICIO: Record<string, string> = {
  'demo-de-astrotherapy-pro': 'demo_astrotherapy',
  'diagnostico-astrologico-terapeutico': 'diagnostico_astrologico',
  'revolucion-solar-terapeutica': 'revolucion_solar',
  'constelaciones-familiares-individuales': 'constelaciones',
  'bioastrogenealogia-sistemica': 'bioastrogenealogia',
  'tarot-terapeutico': 'tarot_terapeutico',
  'tarot-evolutivo-e-integracion-emocional': 'tarot_evolutivo',
  'terapia-integral-de-transformacion-primera-sesion': 'terapia_integral',
  'programa-biodescodificacion-de-salud-primera-sesion': 'biodescodificacion',
};

// ─── Tipos ──────────────────────────────────────────────────────────────────
export interface CalendlyEvent {
  uri: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  event_type: string;        // URI del event_type
  location?: { type: string; join_url?: string };
  cancellation?: { reason?: string };
  created_at: string;
}

export interface CalendlyInvitee {
  uri: string;
  email: string;
  name: string;
  status: string;
  questions_and_answers?: { question: string; answer: string }[];
  created_at: string;
  cancel_url?: string;
  reschedule_url?: string;
  timezone?: string;
}

export interface SyncResult {
  ok: boolean;
  contactoId?: string;
  accion: string;
  detalle?: string;
  error?: string;
}

// ─── Extraer slug del URI de event_type ─────────────────────────────────────
function slugFromEventTypeUri(uri: string): string {
  // URI: https://api.calendly.com/event_types/UUID
  // No contiene slug, lo resolvemos después via nombre
  return uri.split('/').pop() ?? '';
}

// ─── Sync: procesar un evento + invitee → Contacto CRM ─────────────────────
export async function syncCalendlyBooking(
  event: CalendlyEvent,
  invitee: CalendlyInvitee,
  eventTypeSlug?: string,
): Promise<SyncResult> {
  const sb = getSupabase();
  const email = invitee.email.toLowerCase().trim();
  const nombre = invitee.name || email.split('@')[0];
  const servicio = eventTypeSlug ? (SLUG_TO_SERVICIO[eventTypeSlug] ?? eventTypeSlug) : 'calendly';

  // ─── NUEVO: Buscar lead reciente con atribución ────────────────────────────
  let attribution: Record<string, unknown> = {};
  let attributionMatchMethod = 'none';

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  try {
    const { data: lead, error: leadError } = await sb
      .from('leads')
      .select('attribution')
      .eq('email', email)
      .gte('created_at', thirtyMinutesAgo.toISOString())
      .order('created_at', { ascending: false })
      .single();

    if (lead?.attribution) {
      attribution = lead.attribution;
      attributionMatchMethod = 'email_timestamp_30m';
    }
  } catch (err) {
    // Lead not found or error querying; continue without attribution
  }
  // ────────────────────────────────────────────────────────────────────────────

  // 1. Buscar o crear contacto
  const { data: existente } = await sb
    .from('Contacto')
    .select('id, etiquetas, interacciones, leadScore')
    .eq('email', email)
    .eq('organizacionId', 'org-luz-holistica')
    .single();

  let contactoId: string;
  let accion: string;

  if (existente) {
    // Actualizar contacto existente
    contactoId = existente.id;
    const etiquetas = JSON.parse(existente.etiquetas || '[]') as string[];
    if (!etiquetas.includes(servicio)) etiquetas.push(servicio);
    if (!etiquetas.includes('calendly')) etiquetas.push('calendly');

    const isDemo = eventTypeSlug === 'demo-de-astrotherapy-pro';
    const nuevoEstado = isDemo ? 'cualificado' : 'contactado';
    const scoreBoost = isDemo ? 25 : 15;

    await sb.from('Contacto').update({
      estado: nuevoEstado,
      etiquetas: JSON.stringify(etiquetas),
      interacciones: (existente.interacciones ?? 0) + 1,
      leadScore: Math.min((existente.leadScore ?? 0) + scoreBoost, 100),
      ultimaInteraccion: new Date().toISOString(),
      fuente: 'calendly',
      proximaAccionFecha: event.start_time,
      proximosPasos: `Sesión "${event.name}" agendada para ${new Date(event.start_time).toLocaleString('es-MX')}`,
    }).eq('id', contactoId);

    accion = 'actualizado';
  } else {
    // Crear contacto nuevo
    const isDemo = eventTypeSlug === 'demo-de-astrotherapy-pro';
    const etiquetas = ['calendly', servicio];

    const { data: nuevo, error } = await sb
      .from('Contacto')
      .insert({
        nombre,
        email,
        fuente: 'calendly',
        estado: isDemo ? 'cualificado' : 'contactado',
        leadScore: isDemo ? 30 : 20,
        etiquetas: JSON.stringify(etiquetas),
        interacciones: 1,
        ultimaInteraccion: new Date().toISOString(),
        proximaAccionFecha: event.start_time,
        proximosPasos: `Sesión "${event.name}" agendada`,
        organizacionId: 'org-luz-holistica',
        zonaHoraria: invitee.timezone ?? null,
      })
      .select('id')
      .single();

    if (error) return { ok: false, accion: 'error_crear', error: error.message };
    contactoId = nuevo!.id;
    accion = 'creado';
  }

  // 2. Registrar acción en historial CON información de atribución
  const attrNote = attributionMatchMethod !== 'none'
    ? ` [${attributionMatchMethod}]`
    : '';

  await sb.from('Accion').insert({
    contactoId,
    tipo: 'demo_agendada',
    descripcion: `[Calendly] ${event.name} — ${new Date(event.start_time).toLocaleString('es-MX')}${attrNote}`,
    puntosAplicados: eventTypeSlug === 'demo-de-astrotherapy-pro' ? 25 : 15,
  });

  // 2.5 Registrar en conversion_events (idempotencia)
  // NOTA: Tabla conversion_events aún no creada en Supabase
  // Una vez creada, descomentar:
  /*
  try {
    const { data: existing } = await sb
      .from('conversion_events')
      .select('id, state')
      .eq('event_id', invitee.uri)
      .eq('event_type', 'calendly_booking')
      .single();

    let conversionEventId: string;
    if (!existing) {
      const { data: created } = await sb
        .from('conversion_events')
        .insert({
          event_id: invitee.uri,
          event_type: 'calendly_booking',
          contacto_id: contactoId,
          email,
          state: 'received',
        })
        .select('id')
        .single();
      conversionEventId = created?.id ?? '';
    } else {
      conversionEventId = existing.id;
    }
  } catch (err) {
    console.warn('[Calendly] Error en conversion_events:', err);
  }
  */

  // 2.6 Enviar a GA4 (calendar_booking) — SIEMPRE, no condicional a isPaid
  const ga4Result = await GA4.sendCalendarBookingEvent({
    eventId: invitee.uri,
    eventName: event.name,
    userEmail: email,
    userId: attribution?.lead_id as string | undefined,
    scheduledTime: event.start_time,
    clientId: (attribution?.ga_client_id as string | null) ?? null,
    customParams: {
      utm_source: ((attribution?.first_touch as Record<string, unknown>)?.utm_source as string) ?? null,
      utm_medium: ((attribution?.first_touch as Record<string, unknown>)?.utm_medium as string) ?? null,
      utm_campaign: ((attribution?.first_touch as Record<string, unknown>)?.utm_campaign as string) ?? null,
      attribution_method: attributionMatchMethod,
    },
  });

  if (!ga4Result.ok) {
    console.warn('[Calendly] GA4 error (no bloquea):', ga4Result.error);
  }

  // 2.7 Enviar a Meta (Schedule) — SIEMPRE, no condicional a isPaid
  const metaResult = await Meta.sendScheduleEvent({
    eventId: invitee.uri,
    contentName: event.name,
    userEmail: email,
    userId: attribution?.lead_id as string | undefined,
    fbclid: (attribution?.clicks as Record<string, unknown>)?.fbclid as string | undefined,
  });

  if (!metaResult.ok) {
    console.warn('[Calendly] Meta error (no bloquea):', metaResult.error);
  }

  // 3. Disparar evento al motor de automatizaciones CON atribución
  try {
    await dispatchEvento('calendly.booking_created', {
      contactoId,
      email,
      nombre,
      servicio,
      eventTypeSlug: eventTypeSlug ?? '',
      startTime: event.start_time,
      endTime: event.end_time,
      eventName: event.name,
      isPaid: eventTypeSlug !== 'demo-de-astrotherapy-pro',
      attribution, // ← Incluir atribución
      attributionMatchMethod, // ← Incluir nivel de confianza
    });
  } catch (err) {
    // No bloquear el sync si el dispatch falla
    console.warn('[Calendly] Error en dispatchEvento:', (err as Error).message);
  }

  return { ok: true, contactoId, accion, detalle: `${event.name} → ${email}` };
}

// ─── Sync: cancelación ──────────────────────────────────────────────────────
export async function syncCalendlyCancellation(
  event: CalendlyEvent,
  invitee: CalendlyInvitee,
): Promise<SyncResult> {
  const sb = getSupabase();
  const email = invitee.email.toLowerCase().trim();

  const { data: contacto } = await sb
    .from('Contacto')
    .select('id')
    .eq('email', email)
    .eq('organizacionId', 'org-luz-holistica')
    .single();

  if (!contacto) return { ok: true, accion: 'ignorado', detalle: 'Contacto no encontrado para cancelación' };

  await sb.from('Accion').insert({
    contactoId: contacto.id,
    tipo: 'nota',
    descripcion: `[Calendly] Cancelación: ${event.name} — Motivo: ${event.cancellation?.reason ?? 'sin motivo'}`,
    puntosAplicados: -5,
  });

  // Ajustar score
  await sb.from('Contacto').update({
    leadScore: Math.max(0, (await sb.from('Contacto').select('leadScore').eq('id', contacto.id).single()).data?.leadScore - 5),
    proximosPasos: `Sesión "${event.name}" cancelada`,
    proximaAccionFecha: null,
  }).eq('id', contacto.id);

  try {
    await dispatchEvento('calendly.booking_cancelled', {
      contactoId: contacto.id,
      email,
      eventName: event.name,
      reason: event.cancellation?.reason ?? '',
    });
  } catch (err) {
    console.warn('[Calendly] Error en dispatchEvento (cancel):', (err as Error).message);
  }

  return { ok: true, contactoId: contacto.id, accion: 'cancelacion_registrada' };
}

// ─── Mapeo público de slugs (para la ruta) ──────────────────────────────────
export const CALENDLY_SLUG_MAP = SLUG_TO_SERVICIO;
