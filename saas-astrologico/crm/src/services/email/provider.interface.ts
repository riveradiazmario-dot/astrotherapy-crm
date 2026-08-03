// ─── Interfaz común para todos los proveedores de email ──────────────────────

export interface EmailPayload {
  para: string | string[];
  asunto: string;
  html: string;
  texto?: string;
  responderA?: string;
  cc?: string | string[];
  cco?: string | string[];
}

export interface ResultadoEnvio {
  ok: boolean;
  messageId?: string;
  error?: string;
  para: string | string[];
  proveedor: string;
}

export interface VerificacionConexion {
  ok: boolean;
  mensaje: string;
  proveedor: string;
}

// ─── Contrato que deben cumplir todos los proveedores ────────────────────────
export interface EmailProvider {
  readonly nombre: string;
  send(payload: EmailPayload): Promise<ResultadoEnvio>;
  verify(): Promise<VerificacionConexion>;
}

// ─── Config genérica guardada en smtp_configs ─────────────────────────────────
export interface ProviderConfig {
  id: string;
  nombre: string;
  tipo: 'resend' | 'smtp' | 'brevo' | 'sendgrid';
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
