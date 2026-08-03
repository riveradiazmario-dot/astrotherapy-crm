// ─── Proveedor Brevo (ex-Sendinblue) ─────────────────────────────────────────
import { EmailProvider, EmailPayload, ResultadoEnvio, VerificacionConexion, ProviderConfig } from './provider.interface';

export class BrevoProvider implements EmailProvider {
  readonly nombre = 'brevo';
  private apiKey: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    if (!config.api_key) throw new Error('Brevo requiere api_key');
    this.apiKey = config.api_key;
    this.config = config;
  }

  async send(payload: EmailPayload): Promise<ResultadoEnvio> {
    const para = Array.isArray(payload.para) ? payload.para : [payload.para];
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.config.fromNombre, email: this.config.fromEmail },
          to: para.map(email => ({ email })),
          subject: payload.asunto,
          htmlContent: payload.html,
          textContent: payload.texto,
        }),
      });

      const data = await res.json() as { messageId?: string; message?: string };

      if (!res.ok) {
        return { ok: false, error: data.message ?? `HTTP ${res.status}`, para: payload.para, proveedor: this.nombre };
      }
      return { ok: true, messageId: data.messageId, para: payload.para, proveedor: this.nombre };
    } catch (err) {
      return { ok: false, error: (err as Error).message, para: payload.para, proveedor: this.nombre };
    }
  }

  async verify(): Promise<VerificacionConexion> {
    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': this.apiKey },
      });
      if (res.ok) return { ok: true, mensaje: 'Brevo API key válida', proveedor: this.nombre };
      return { ok: false, mensaje: `Brevo: HTTP ${res.status}`, proveedor: this.nombre };
    } catch (err) {
      return { ok: false, mensaje: `Brevo: ${(err as Error).message}`, proveedor: this.nombre };
    }
  }
}
