// ─── Proveedor Resend ─────────────────────────────────────────────────────────
import { EmailProvider, EmailPayload, ResultadoEnvio, VerificacionConexion, ProviderConfig } from './provider.interface';

export class ResendProvider implements EmailProvider {
  readonly nombre = 'resend';
  private apiKey: string;
  private from: string;

  constructor(config: ProviderConfig) {
    if (!config.api_key) throw new Error('Resend requiere api_key');
    this.apiKey = config.api_key;
    this.from = `${config.fromNombre} <${config.fromEmail}>`;
  }

  async send(payload: EmailPayload): Promise<ResultadoEnvio> {
    const para = Array.isArray(payload.para) ? payload.para : [payload.para];
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: para,
          subject: payload.asunto,
          html: payload.html,
          text: payload.texto,
          reply_to: payload.responderA,
          cc: payload.cc,
          bcc: payload.cco,
        }),
      });

      const data = await res.json() as { id?: string; name?: string; message?: string };

      if (!res.ok) {
        return { ok: false, error: data.message ?? data.name ?? `HTTP ${res.status}`, para: payload.para, proveedor: this.nombre };
      }

      return { ok: true, messageId: data.id, para: payload.para, proveedor: this.nombre };
    } catch (err) {
      return { ok: false, error: (err as Error).message, para: payload.para, proveedor: this.nombre };
    }
  }

  async verify(): Promise<VerificacionConexion> {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      if (res.ok) return { ok: true, mensaje: 'Resend API key válida ✓', proveedor: this.nombre };
      const body = await res.json().catch(() => ({})) as { name?: string; message?: string };
      const detalle = body.message ?? body.name ?? '';
      if (res.status === 401) {
        return { ok: false, mensaje: `API key inválida o revocada (HTTP 401). Genera una nueva key en resend.com/api-keys`, proveedor: this.nombre };
      }
      return { ok: false, mensaje: `Resend: HTTP ${res.status}${detalle ? ' — ' + detalle : ''}`, proveedor: this.nombre };
    } catch (err) {
      return { ok: false, mensaje: `Resend: ${(err as Error).message}`, proveedor: this.nombre };
    }
  }
}
