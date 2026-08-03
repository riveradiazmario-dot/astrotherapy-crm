// ─── Interfaz común para manejadores de acciones ─────────────────────────────
// Los canales (email, WhatsApp, Messenger) implementan esta interfaz
// y se registran en el ActionRegistry. El motor no los conoce directamente.

export interface ActionContext {
  contactoId?: string;
  organizacionId: string;
  evento: string;
  payload: Record<string, unknown>;   // datos del evento original
}

export interface ActionResult {
  ok: boolean;
  tipo: string;
  detalle?: string;
  error?: string;
}

export interface ActionHandler {
  readonly tipo: string;              // identificador único: 'send_email', 'wait', etc.
  execute(config: Record<string, unknown>, context: ActionContext): Promise<ActionResult>;
}
