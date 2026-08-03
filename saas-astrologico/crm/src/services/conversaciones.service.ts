// ─── Servicio Conversaciones ────────────────────────────────────────────────
//
// Historial unificado de interacciones por contacto.
// Cada conversación es un hilo (email, whatsapp, nota, sistema, etc.)
// Cada mensaje es una interacción dentro del hilo.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_KEY no configurada');
    _supabase = createClient(process.env.SUPABASE_URL!, key);
  }
  return _supabase;
}

// ─── Tipos ──────────────────────────────────────────────────────────────────
export type Canal = 'email' | 'whatsapp' | 'messenger' | 'telefono' | 'nota' | 'calendly' | 'stripe' | 'sistema';
export type Direccion = 'entrante' | 'saliente' | 'interno';
export type TipoMensaje = 'texto' | 'email' | 'nota' | 'sistema' | 'archivo';

export interface NuevoMensaje {
  conversacionId?: string;       // Si existe, agrega al hilo. Si no, crea uno nuevo.
  contactoId: string;
  canal?: Canal;
  asunto?: string;
  direccion?: Direccion;
  contenido: string;
  contenidoHtml?: string;
  tipo?: TipoMensaje;
  metadata?: Record<string, unknown>;
  creadoPor?: string;
}

// ─── Obtener o crear conversación ───────────────────────────────────────────
async function obtenerOCrearConversacion(
  contactoId: string,
  canal: Canal = 'nota',
  asunto?: string,
): Promise<string> {
  const sb = getSupabase();

  // Buscar conversación abierta del mismo canal
  const { data: existente } = await sb
    .from('conversaciones')
    .select('id')
    .eq('contactoId', contactoId)
    .eq('canal', canal)
    .eq('estado', 'abierta')
    .order('ultimoMensaje', { ascending: false })
    .limit(1)
    .single();

  if (existente) return existente.id;

  // Crear nueva
  const { data: nueva, error } = await sb
    .from('conversaciones')
    .insert({ contactoId, canal, asunto: asunto ?? `${canal} — ${new Date().toLocaleDateString('es-MX')}` })
    .select('id')
    .single();

  if (error) throw new Error(`Error creando conversación: ${error.message}`);
  return nueva!.id;
}

// ─── Registrar mensaje ──────────────────────────────────────────────────────
export async function registrarMensaje(msg: NuevoMensaje): Promise<{ conversacionId: string; mensajeId: string }> {
  const sb = getSupabase();

  const conversacionId = msg.conversacionId
    ?? await obtenerOCrearConversacion(msg.contactoId, msg.canal, msg.asunto);

  const { data: mensaje, error } = await sb
    .from('mensajes')
    .insert({
      conversacionId,
      direccion: msg.direccion ?? 'saliente',
      contenido: msg.contenido,
      contenidoHtml: msg.contenidoHtml,
      tipo: msg.tipo ?? 'texto',
      metadata: msg.metadata ?? {},
      creadoPor: msg.creadoPor,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Error registrando mensaje: ${error.message}`);

  // Actualizar timestamp de última actividad
  await sb.from('conversaciones')
    .update({ ultimoMensaje: new Date().toISOString() })
    .eq('id', conversacionId);

  return { conversacionId, mensajeId: mensaje!.id };
}

// ─── Registrar evento de sistema (Calendly, Stripe, automación) ─────────────
export async function registrarEventoSistema(
  contactoId: string,
  canal: Canal,
  contenido: string,
  metadata?: Record<string, unknown>,
): Promise<{ conversacionId: string; mensajeId: string }> {
  return registrarMensaje({
    contactoId,
    canal,
    direccion: 'interno',
    contenido,
    tipo: 'sistema',
    metadata,
    creadoPor: 'sistema',
  });
}

// ─── Listar conversaciones de un contacto ───────────────────────────────────
export async function listarConversaciones(contactoId: string, limit = 20) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('conversaciones')
    .select('*, mensajes(count)')
    .eq('contactoId', contactoId)
    .order('ultimoMensaje', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data;
}

// ─── Obtener mensajes de una conversación ───────────────────────────────────
export async function obtenerMensajes(conversacionId: string, limit = 50) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('mensajes')
    .select('*')
    .eq('conversacionId', conversacionId)
    .order('createdAt', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data;
}

// ─── Timeline unificado (todos los mensajes de un contacto) ─────────────────
export async function obtenerTimeline(contactoId: string, limit = 100) {
  const sb = getSupabase();

  // Obtener IDs de conversaciones del contacto
  const { data: convs } = await sb
    .from('conversaciones')
    .select('id, canal, asunto')
    .eq('contactoId', contactoId);

  if (!convs?.length) return [];

  const convIds = convs.map(c => c.id);

  const { data: mensajes, error } = await sb
    .from('mensajes')
    .select('*, conversaciones!inner(canal, asunto)')
    .in('conversacionId', convIds)
    .order('createdAt', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return mensajes;
}

// ─── Cerrar conversación ────────────────────────────────────────────────────
export async function cerrarConversacion(conversacionId: string) {
  const sb = getSupabase();
  const { error } = await sb
    .from('conversaciones')
    .update({ estado: 'cerrada' })
    .eq('id', conversacionId);
  if (error) throw new Error(error.message);
}
