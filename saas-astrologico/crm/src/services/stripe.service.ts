// ─── Servicio Stripe ────────────────────────────────────────────────────────
//
// Responsabilidades:
//   1. Procesar webhooks de Stripe → sync con tabla Contacto del CRM
//   2. Mapear product_id → servicio/etiqueta CRM
//   3. Disparar eventos al motor de automatizaciones
//
// No implementa lógica de checkout — eso vive en las Edge Functions de Supabase.
// Este servicio solo procesa los eventos post-pago.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { dispatchEvento } from './automations/engine';
import * as GA4 from './ga4.service';
import * as Meta from './meta.service';
import * as ConversionEvents from './conversion-events.service';

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_KEY no configurada');
    _supabase = createClient(process.env.SUPABASE_URL!, key);
  }
  return _supabase;
}

// ─── Mapeo de product_id → etiqueta CRM ─────────────────────────────────────
const PRODUCT_MAP: Record<string, { nombre: string; etiqueta: string; tipo: 'consulta' | 'programa' | 'formacion' | 'membresia'; mxn: number }> = {
  'prod_Uqr3uMLX6qQFbQ': { nombre: 'Diagnóstico Astrológico Terapéutico', etiqueta: 'diagnostico_astrologico', tipo: 'consulta', mxn: 1800 },
  'prod_Uqr3buPSQnJHqq': { nombre: 'BioAstrogenealogía Sistémica', etiqueta: 'bioastrogenealogia', tipo: 'consulta', mxn: 2800 },
  'prod_Uqr36LncIw5Kx1': { nombre: 'Revolución Solar Terapéutica', etiqueta: 'revolucion_solar', tipo: 'consulta', mxn: 1200 },
  'prod_Uqr34ezFrJnQmu': { nombre: 'Constelaciones Familiares Individuales', etiqueta: 'constelaciones', tipo: 'consulta', mxn: 1500 },
  'prod_Uqr3jzMVIt40iU': { nombre: 'Tarot Terapéutico', etiqueta: 'tarot_terapeutico', tipo: 'consulta', mxn: 800 },
  'prod_Uqr3AFlXEd2foI': { nombre: 'Tarot Evolutivo e Integración Emocional', etiqueta: 'tarot_evolutivo', tipo: 'consulta', mxn: 1200 },
  'prod_Uqr3NmNCmtC2hV': { nombre: 'Terapia Integral de Transformación', etiqueta: 'terapia_integral', tipo: 'programa', mxn: 5500 },
  'prod_Uqr3U0BYMkkMgC': { nombre: 'Programa Biodescodificación de Salud', etiqueta: 'biodescodificacion', tipo: 'programa', mxn: 6500 },
  'prod_Uqr34Ynn8dp3wQ': { nombre: 'Programa Profesional Astrología + Tarot', etiqueta: 'formacion_profesional', tipo: 'formacion', mxn: 11900 },
  'prod_Uqr3aM8lkzOgTe': { nombre: 'Curso Astrología Terapéutica', etiqueta: 'curso_astrologia', tipo: 'formacion', mxn: 2500 },
  'prod_Uqr3GeAhY4zm72': { nombre: 'Curso Tarot Terapéutico', etiqueta: 'curso_tarot', tipo: 'formacion', mxn: 1200 },
  'prod_Uqr3YffmZa1CW7': { nombre: 'Curso Astrogenealogía Sistémica', etiqueta: 'curso_astrogenealogia', tipo: 'formacion', mxn: 3500 },
  'prod_Uqr3VPFAxPY6qr': { nombre: 'Círculo Evolución Consciente — Fundador', etiqueta: 'membresia_fundador', tipo: 'membresia', mxn: 297 },
  'prod_Uqr3G083wRILlQ': { nombre: 'Círculo Evolución Consciente — Premium', etiqueta: 'membresia_premium', tipo: 'membresia', mxn: 497 },
};

// ─── Tipos ──────────────────────────────────────────────────────────────────
export interface StripeCheckoutSession {
  id: string;
  customer_email?: string;
  customer_details?: { email?: string; name?: string };
  payment_status: string;
  amount_total?: number;
  currency?: string;
  line_items?: { data?: { price?: { product?: string } }[] };
  metadata?: Record<string, string>;
  mode?: string; // 'payment' | 'subscription'
  client_reference_id?: string; // lead_id from Stripe Payment Link
}

export interface StripeInvoice {
  id: string;
  customer_email?: string;
  customer_name?: string;
  status: string;
  amount_paid?: number;
  currency?: string;
  lines?: { data?: { price?: { product?: string } }[] };
  subscription?: string;
}

export interface SyncResult {
  ok: boolean;
  contactoId?: string;
  accion: string;
  detalle?: string;
  error?: string;
}

// ─── Sync: checkout completado → Contacto CRM ──────────────────────────────
export async function syncCheckoutCompleted(session: StripeCheckoutSession): Promise<SyncResult> {
  const sb = getSupabase();
  const email = (session.customer_email ?? session.customer_details?.email ?? '').toLowerCase().trim();
  const nombre = session.customer_details?.name ?? email.split('@')[0];
  const lead_id = session.client_reference_id; // ← NUEVO: Recuperar lead_id

  if (!email) return { ok: false, accion: 'error', error: 'Sin email en el checkout' };

  // Resolver producto
  const productId = session.line_items?.data?.[0]?.price?.product as string | undefined;
  const producto = productId ? PRODUCT_MAP[productId] : null;
  const montoMXN = session.amount_total ? session.amount_total / 100 : (producto?.mxn ?? 0);

  // ─── NUEVO: Buscar lead con atribución ─────────────────────────────────────
  let attribution: Record<string, unknown> = {};
  if (lead_id && email) {
    try {
      // Buscar por email primero, luego filtrar por lead_id en memoria
      // (Supabase JSONB filtering puede ser inconsistente, email es más fiable)
      const { data: leads, error: leadError } = await sb
        .from('leads')
        .select('attribution')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (leads && leads.length > 0 && leads[0].attribution) {
        const leadAttribution = leads[0].attribution as Record<string, unknown>;
        // Validar que el lead_id coincida
        if (leadAttribution.lead_id === lead_id) {
          attribution = leadAttribution;
        }
      }
    } catch (err) {
      console.warn('[Stripe] Error searching lead by email/lead_id:', err);
      // Continuar sin atribución si falla la búsqueda
    }
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
    contactoId = existente.id;
    const etiquetas = JSON.parse(existente.etiquetas || '[]') as string[];
    if (producto && !etiquetas.includes(producto.etiqueta)) etiquetas.push(producto.etiqueta);
    if (!etiquetas.includes('cliente_pagado')) etiquetas.push('cliente_pagado');
    if (producto?.tipo === 'membresia' && !etiquetas.includes('membresia_activa')) etiquetas.push('membresia_activa');

    await sb.from('Contacto').update({
      estado: 'cliente',
      etiquetas: JSON.stringify(etiquetas),
      interacciones: (existente.interacciones ?? 0) + 1,
      leadScore: Math.min((existente.leadScore ?? 0) + 30, 100),
      ultimaInteraccion: new Date().toISOString(),
    }).eq('id', contactoId);

    accion = 'actualizado';
  } else {
    const etiquetas = ['cliente_pagado'];
    if (producto) etiquetas.push(producto.etiqueta);
    if (producto?.tipo === 'membresia') etiquetas.push('membresia_activa');

    const { data: nuevo, error } = await sb
      .from('Contacto')
      .insert({
        nombre,
        email,
        fuente: 'stripe',
        estado: 'cliente',
        leadScore: 50,
        etiquetas: JSON.stringify(etiquetas),
        interacciones: 1,
        ultimaInteraccion: new Date().toISOString(),
        organizacionId: 'org-luz-holistica',
      })
      .select('id')
      .single();

    if (error) return { ok: false, accion: 'error_crear', error: error.message };
    contactoId = nuevo!.id;
    accion = 'creado';
  }

  // 2. Registrar acción CON atribución
  const firstTouchSource = ((attribution?.first_touch as Record<string, unknown>)?.utm_source as string) ?? 'directo';
  const descripcionAttr = attribution?.lead_id
    ? ` [${firstTouchSource}]`
    : '';

  await sb.from('Accion').insert({
    contactoId,
    tipo: 'compra',
    descripcion: `[Stripe] ${producto?.nombre ?? 'Pago'} — $${montoMXN} MXN${descripcionAttr}`,
    puntosAplicados: 30,
  });

  // 2.5 UPSERT conversion_events (UNIQUE constraint protege contra duplicados)
  // NOTA: Tabla conversion_events será creada en FASE B
  // Código comentado hasta que SQL se ejecute:
  /*
  let conversionEvent: any = null;
  try {
    conversionEvent = await ConversionEvents.upsertConversionEvent(
      session.id,
      'stripe_purchase',
      email,
      contactoId,
    );
    console.log('[Stripe] Conversion event created/updated:', conversionEvent.id);
  } catch (err) {
    console.warn('[Stripe] Error en conversion_events (no bloquea):', ConversionEvents.sanitizeErrorForLogging(err));
    // Continuar sin conversion_events (falla no crítica)
  }
  */

  // 2.6 Determinar qué enviar (GA4 / Meta)
  // En primera ejecución: enviar a ambos
  // En reintento: enviar solo a los que fallaron
  /*
  let sendToGA4 = true;
  let sendToMeta = true;

  if (conversionEvent) {
    const destinations = await ConversionEvents.getDestinationsToProcees(session.id, 'stripe_purchase');
    sendToGA4 = destinations.sendToGA4;
    sendToMeta = destinations.sendToMeta;
  }
  */

  // 2.7 Enviar a GA4 (Purchase)
  let ga4Result: { ok: boolean; error?: string } = { ok: false };
  const sendToGA4 = true; // TODO: descomenta logica arriba
  if (sendToGA4) {
    ga4Result = await GA4.sendPurchaseEvent({
      transactionId: session.id,
      value: montoMXN,
      currency: session.currency ?? 'MXN',
      email,
      userId: attribution?.lead_id as string | undefined,
      productId: productId,
      productName: producto?.nombre,
      clientId: (attribution?.ga_client_id as string | null) ?? null,
      customParams: {
        utm_source: ((attribution?.first_touch as Record<string, unknown>)?.utm_source as string) ?? null,
        utm_medium: ((attribution?.first_touch as Record<string, unknown>)?.utm_medium as string) ?? null,
        utm_campaign: ((attribution?.first_touch as Record<string, unknown>)?.utm_campaign as string) ?? null,
      },
    });

    // TODO: Descomenta cuando conversion_events esté en BD
    // if (conversionEvent) {
    //   await ConversionEvents.updateGA4Status(
    //     session.id,
    //     'stripe_purchase',
    //     ga4Result.ok ? 'sent' : 'failed',
    //     ga4Result.error,
    //     ga4Result,
    //   );
    // }
  }

  if (!ga4Result.ok) {
    console.warn('[Stripe] GA4 error (no bloquea):', ga4Result.error);
  }

  // 2.8 Enviar a Meta (Purchase)
  let metaResult: { ok: boolean; error?: string } = { ok: false };
  const sendToMeta = true; // TODO: descomenta logica arriba
  if (sendToMeta) {
    metaResult = await Meta.sendPurchaseEvent({
      eventId: session.id,
      value: montoMXN,
      currency: session.currency ?? 'MXN',
      contentName: producto?.nombre,
      contentId: productId,
      userEmail: email,
      userId: attribution?.lead_id as string | undefined,
      fbclid: (attribution?.clicks as Record<string, unknown>)?.fbclid as string | undefined,
    });

    // TODO: Descomenta cuando conversion_events esté en BD
    // if (conversionEvent) {
    //   await ConversionEvents.updateMetaStatus(
    //     session.id,
    //     'stripe_purchase',
    //     metaResult.ok ? 'sent' : 'failed',
    //     metaResult.error,
    //     metaResult,
    //   );
    //
    //   if (ga4Result.ok && metaResult.ok) {
    //     await ConversionEvents.markCompleted(session.id, 'stripe_purchase');
    //   }
    // }
  }

  if (!metaResult.ok) {
    console.warn('[Stripe] Meta error (no bloquea):', metaResult.error);
  }

  // 3. Disparar al motor CON atribución
  try {
    await dispatchEvento('stripe.checkout_completed', {
      contactoId,
      email,
      nombre,
      productId: productId ?? '',
      productoNombre: producto?.nombre ?? '',
      productoTipo: producto?.tipo ?? '',
      productoEtiqueta: producto?.etiqueta ?? '',
      montoMXN,
      mode: session.mode ?? 'payment',
      attribution, // ← Incluir atribución en evento
    });
  } catch (err) {
    console.warn('[Stripe] Error en dispatchEvento:', (err as Error).message);
  }

  return { ok: true, contactoId, accion, detalle: `${producto?.nombre ?? 'Pago'} → ${email} ($${montoMXN} MXN)` };
}

// ─── Sync: suscripción cancelada ────────────────────────────────────────────
export async function syncSubscriptionCancelled(email: string, productId?: string): Promise<SyncResult> {
  const sb = getSupabase();
  if (!email) return { ok: false, accion: 'error', error: 'Sin email' };

  const { data: contacto } = await sb
    .from('Contacto')
    .select('id, etiquetas')
    .eq('email', email.toLowerCase().trim())
    .eq('organizacionId', 'org-luz-holistica')
    .single();

  if (!contacto) return { ok: true, accion: 'ignorado', detalle: 'Contacto no encontrado' };

  const etiquetas = JSON.parse(contacto.etiquetas || '[]') as string[];
  const idx = etiquetas.indexOf('membresia_activa');
  if (idx !== -1) etiquetas.splice(idx, 1);
  if (!etiquetas.includes('membresia_cancelada')) etiquetas.push('membresia_cancelada');

  await sb.from('Contacto').update({ etiquetas: JSON.stringify(etiquetas) }).eq('id', contacto.id);

  await sb.from('Accion').insert({
    contactoId: contacto.id,
    tipo: 'nota',
    descripcion: '[Stripe] Membresía cancelada',
    puntosAplicados: -10,
  });

  try {
    await dispatchEvento('stripe.subscription_cancelled', { contactoId: contacto.id, email, productId: productId ?? '' });
  } catch (err) {
    console.warn('[Stripe] Error en dispatchEvento (cancel):', (err as Error).message);
  }

  return { ok: true, contactoId: contacto.id, accion: 'membresia_cancelada' };
}

// ─── Mapeo público ──────────────────────────────────────────────────────────
export const STRIPE_PRODUCT_MAP = PRODUCT_MAP;
