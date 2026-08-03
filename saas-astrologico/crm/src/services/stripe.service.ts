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

  if (!email) return { ok: false, accion: 'error', error: 'Sin email en el checkout' };

  // Resolver producto
  const productId = session.line_items?.data?.[0]?.price?.product as string | undefined;
  const producto = productId ? PRODUCT_MAP[productId] : null;
  const montoMXN = session.amount_total ? session.amount_total / 100 : (producto?.mxn ?? 0);

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

  // 2. Registrar acción
  await sb.from('Accion').insert({
    contactoId,
    tipo: 'compra',
    descripcion: `[Stripe] ${producto?.nombre ?? 'Pago'} — $${montoMXN} MXN`,
    puntosAplicados: 30,
  });

  // 3. Disparar al motor
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
