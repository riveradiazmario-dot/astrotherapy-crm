// ─── Proveedor SendGrid ───────────────────────────────────────────────────────
import { EmailProvider, EmailPayload, ResultadoEnvio, VerificacionConexion, ProviderConfig } from './provider.interface';

export class SendGridProvider implements EmailProvider {
  readonly nombre = 'sendgrid';
  private apiKey: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    if (!config.api_key) throw new Error('SendGrid requiere api_key');
    this.apiKey = config.api_key;
    this.config = config;
  }

  async send(payload: EmailPayload): Promise<ResultadoEnvio> {
    const para = Array.isArray(payload.para) ? payload.para : [payload.para];
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: { email: this.config.fromEmail, name: this.config.fromNombre },
          personalizations: [{ to: para.map(email => ({ email })) }],
          subject: payload.asunto,
          content: [{ type: 'text/html', value: payload.html }],
        }),
      });

      if (res.status === 202) {
        const msgId = res.headers.get('X-Message-Id') ?? undefined;
        return { ok: true, messageId: msgId, para: payload.para, proveedor: this.nombre };
      }
      const data = await res.json().catch(() => ({})) as { errors?: { message: string }[] };
      const errorMsg = data.errors?.[0]?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: errorMsg, para: payload.para, proveedor: this.nombre };
    } catch (err) {
      return { ok: false, error: (err as Error).message, para: payload.para, proveedor: this.nombre };
    }
  }

  async verify(): Promise<VerificacionConexion> {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      if (res.ok) return { ok: true, mensaje: 'SendGrid API key válida', proveedor: this.nombre };
      return { ok: false, mensaje: `SendGrid: HTTP ${res.status}`, proveedor: this.nombre };
    } catch (err) {
      return { ok: false, mensaje: `SendGrid: ${(err as Error).message}`, proveedor: this.nombre };
    }
  }
}
