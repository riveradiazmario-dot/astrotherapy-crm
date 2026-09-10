// ─── Bootstrap del motor de automatizaciones ─────────────────────────────────
// Registra las acciones built-in y los canales consumidores.
// Importar una sola vez en index.ts al arrancar el servidor.

import { actionRegistry } from './action.registry';
import { WaitAction } from './actions/wait.action';
import { WebhookAction } from './actions/webhook.action';
import { UpdateContactAction } from './actions/update-contact.action';
import { AddTagAction, RemoveTagAction } from './actions/add-tag.action';
import { SendEmailAction } from './actions/send-email.action';

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
