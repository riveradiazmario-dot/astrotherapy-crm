// ─── Bootstrap del motor de automatizaciones ─────────────────────────────────
// Registra las acciones built-in y los canales consumidores.
// Importar una sola vez en index.ts al arrancar el servidor.

import { actionRegistry } from './action.registry';
import { WaitAction } from './actions/wait.action';
import { WebhookAction } from './actions/webhook.action';
import { UpdateContactAction } from './actions/update-contact.action';
import { AddTagAction, RemoveTagAction } from './actions/add-tag.action';

// ─── Canal email: consumidor externo del motor ────────────────────────────────
// No pertenece al motor. Se registra aquí para mantenerse desacoplado.
import { ActionHandler, ActionContext, ActionResult } from './action.interface';
import { enviarEmail, templates } from '../smtp.service';

class SendEmailAction implements ActionHandler {
  readonly tipo = 'send_email';

  async execute(config: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const email = (ctx.payload.email ?? config.email) as string;
    const nombre = (ctx.payload.nombre ?? config.nombre ?? 'colega') as string;
    const plantilla = (config.plantilla as keyof typeof templates) ?? 'bienvenida';
    const proveedorId = config.proveedorId as string | undefined;

    if (!email) return { ok: false, tipo: this.tipo, error: 'email requerido en payload o config' };

    const html = templates[plantilla]?.(nombre) ?? templates.bienvenida(nombre);
    const asunto = (config.asunto as string) ?? `Mensaje de AstroTherapy Pro para ${nombre}`;

    const resultado = await enviarEmail({ para: email, asunto, html }, proveedorId);
    return {
      ok: resultado.ok,
      tipo: this.tipo,
      detalle: resultado.ok ? `Email enviado a ${email} via ${resultado.proveedor}` : undefined,
      error: resultado.error,
    };
  }
}

// ─── Registrar todo ───────────────────────────────────────────────────────────
export function bootstrapAutomations(): void {
  // Built-in
  actionRegistry.register(new WaitAction());
  actionRegistry.register(new WebhookAction());
  actionRegistry.register(new UpdateContactAction());
  actionRegistry.register(new AddTagAction());
  actionRegistry.register(new RemoveTagAction());

  // Canales (consumidores externos)
  actionRegistry.register(new SendEmailAction());

  // WhatsApp, Messenger, etc. se registrarán aquí en Sprint 1B
}
