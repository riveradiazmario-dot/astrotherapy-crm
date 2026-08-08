// ─── Servicio SMTP Config — gestión de cuentas SMTP desde Supabase ──────────
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy init — no falla al arrancar si la key aún no está en .env
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL ?? 'https://vfqaxzgyasbpfdrnfpuj.supabase.co';
    const key = process.env.SUPABASE_SERVICE_KEY ?? '';
    if (!key) throw new Error('SUPABASE_SERVICE_KEY no configurada en .env');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export interface SmtpConfig {
  id: string;
  nombre: string;
  tipo?: 'resend' | 'smtp' | 'brevo' | 'sendgrid';
  api_key?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  usuario?: string;
  password?: string;
  fromEmail: string;
  fromNombre: string;
  activo: boolean;
  predeterminado: boolean;
  organizacionId: string;
}

// ─── Obtener config predeterminada ───────────────────────────────────────────
export async function obtenerSmtpPredeterminado(
  organizacionId = 'org-luz-holistica',
): Promise<SmtpConfig | null> {
  const { data, error } = await getSupabase()
    .from('smtp_configs')
    .select('*')
    .eq('organizacionId', organizacionId)
    .eq('predeterminado', true)
    .eq('activo', true)
    .single();

  if (error || !data) return null;
  return data as SmtpConfig;
}

// ─── Obtener config por ID (incluye password — uso interno) ──────────────────
export async function obtenerSmtpConfigPorId(id: string): Promise<SmtpConfig | null> {
  const { data, error } = await getSupabase()
    .from('smtp_configs')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as SmtpConfig;
}

// ─── Listar todas las configs ─────────────────────────────────────────────────
export async function listarSmtpConfigs(
  organizacionId = 'org-luz-holistica',
): Promise<Omit<SmtpConfig, 'password'>[]> {
  const { data } = await getSupabase()
    .from('smtp_configs')
    .select('id, nombre, tipo, host, port, secure, usuario, "fromEmail", "fromNombre", activo, predeterminado, "organizacionId", "createdAt"')
    .eq('organizacionId', organizacionId)
    .order('predeterminado', { ascending: false });

  return (data ?? []) as Omit<SmtpConfig, 'password'>[];
}

// ─── Crear nueva config ───────────────────────────────────────────────────────
export async function crearSmtpConfig(
  payload: Omit<SmtpConfig, 'id'>,
): Promise<SmtpConfig> {
  // Si es predeterminado, quitar el flag de las demás
  if (payload.predeterminado) {
    await getSupabase()
      .from('smtp_configs')
      .update({ predeterminado: false })
      .eq('organizacionId', payload.organizacionId);
  }

  const { data, error } = await getSupabase()
    .from('smtp_configs')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SmtpConfig;
}

// ─── Actualizar config ────────────────────────────────────────────────────────
export async function actualizarSmtpConfig(
  id: string,
  payload: Partial<SmtpConfig>,
): Promise<SmtpConfig> {
  if (payload.predeterminado) {
    const config = await getSupabase()
      .from('smtp_configs')
      .select('organizacionId')
      .eq('id', id)
      .single();
    if (config.data) {
      await getSupabase()
        .from('smtp_configs')
        .update({ predeterminado: false })
        .eq('organizacionId', config.data.organizacionId);
    }
  }

  const { data, error } = await getSupabase()
    .from('smtp_configs')
    .update({ ...payload, updatedAt: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SmtpConfig;
}

// ─── Eliminar config ──────────────────────────────────────────────────────────
export async function eliminarSmtpConfig(id: string): Promise<void> {
  const { error } = await getSupabase().from('smtp_configs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Marcar como predeterminado ───────────────────────────────────────────────
export async function marcarPredeterminado(
  id: string,
  organizacionId = 'org-luz-holistica',
): Promise<void> {
  await getSupabase()
    .from('smtp_configs')
    .update({ predeterminado: false })
    .eq('organizacionId', organizacionId);

  await getSupabase()
    .from('smtp_configs')
    .update({ predeterminado: true })
    .eq('id', id);
}
