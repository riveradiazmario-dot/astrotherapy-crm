// ─── Proveedor SMTP genérico (Neubox, Gmail, cualquier servidor SMTP) ─────────
import nodemailer from 'nodemailer';
import { EmailProvider, EmailPayload, ResultadoEnvio, VerificacionConexion, ProviderConfig } from './provider.interface';

export class SmtpProvider implements EmailProvider {
  readonly nombre = 'smtp';
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    if (!config.host || !config.usuario || !config.password) {
      throw new Error('SMTP requiere host, usuario y password');
    }
    this.config = config;
  }

  private crearTransporter() {
    return nodemailer.createTransport({
      host: this.config.host!,
      port: this.config.port ?? 465,
      secure: this.config.secure ?? true,
      auth: { user: this.config.usuario!, pass: this.config.password! },
      tls: { rejectUnauthorized: false },
    });
  }

  async send(payload: EmailPayload): Promise<ResultadoEnvio> {
    try {
      const from = `${this.config.fromNombre} <${this.config.fromEmail}>`;
      const transporter = this.crearTransporter();
      const info = await transporter.sendMail({
        from,
        to: payload.para,
        subject: payload.asunto,
        html: payload.html,
        text: payload.texto,
        replyTo: payload.responderA ?? from,
        cc: payload.cc,
        bcc: payload.cco,
      });
      return { ok: true, messageId: info.messageId, para: payload.para, proveedor: this.nombre };
    } catch (err) {
      return { ok: false, error: (err as Error).message, para: payload.para, proveedor: this.nombre };
    }
  }

  async verify(): Promise<VerificacionConexion> {
    try {
      const transporter = this.crearTransporter();
      await transporter.verify();
      return { ok: true, mensaje: `SMTP OK — ${this.config.usuario} en ${this.config.host}:${this.config.port}`, proveedor: this.nombre };
    } catch (err) {
      return { ok: false, mensaje: `SMTP: ${(err as Error).message}`, proveedor: this.nombre };
    }
  }
}
