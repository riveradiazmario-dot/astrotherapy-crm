// ─── Acción: Enviar email ─────────────────────────────────────────────────────
import { ActionHandler, ActionContext, ActionResult } from '../action.interface';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();

export class SendEmailAction implements ActionHandler {
  readonly tipo = 'send_email';

  async execute(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    try {
      const { templateId, subject, htmlBody, replyTo } = config;

      if (!ctx.contactoId) {
        return {
          ok: false,
          tipo: this.tipo,
          error: 'No hay contactoId en el contexto',
        };
      }

      // Obtener contacto
      const contacto = await prisma.contacto.findUnique({
        where: { id: ctx.contactoId },
      });

      if (!contacto?.email) {
        return {
          ok: false,
          tipo: this.tipo,
          error: 'Contacto sin email',
        };
      }

      // Obtener config SMTP predeterminada
      const smtpConfig = await prisma.smtpConfig.findFirst({
        where: {
          organizacionId: ctx.organizacionId,
          predeterminado: true,
          activo: true,
        },
      });

      if (!smtpConfig) {
        return {
          ok: false,
          tipo: this.tipo,
          error: 'No hay config SMTP configurada',
        };
      }

      // Enviar según tipo de proveedor
      let resultado: any;

      if (smtpConfig.tipo === 'resend' && smtpConfig.api_key) {
        // Usar Resend
        const resend = new Resend(smtpConfig.api_key);
        resultado = await resend.emails.send({
          from: `${smtpConfig.fromNombre} <${smtpConfig.fromEmail}>`,
          to: contacto.email,
          subject: (subject as string) || 'Mensaje de Luz Holística',
          html: (htmlBody as string) || '<p>Contenido del email</p>',
          replyTo: (replyTo as string) || smtpConfig.fromEmail,
        });

        if (resultado.error) {
          throw new Error(`Resend: ${resultado.error}`);
        }
      } else {
        // SMTP genérico (pendiente: implementar nodemailer)
        return {
          ok: false,
          tipo: this.tipo,
          error: 'SMTP genérico no implementado aún',
        };
      }

      // Registrar envío
      await prisma.contacto.update({
        where: { id: ctx.contactoId },
        data: {
          emailsEnviados: { increment: 1 },
          ultimaInteraccion: new Date(),
        },
      });

      return {
        ok: true,
        tipo: this.tipo,
        detalle: `Email enviado a ${contacto.email} (${resultado.id})`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      return {
        ok: false,
        tipo: this.tipo,
        error: msg,
      };
    }
  }
}
