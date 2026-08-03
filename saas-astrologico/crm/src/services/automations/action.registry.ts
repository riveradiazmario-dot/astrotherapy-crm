// ─── Registro de manejadores de acciones ─────────────────────────────────────
// Los canales se registran aquí al arrancar el servidor.
// El motor consulta el registry en tiempo de ejecución — no importa directamente ningún canal.

import { ActionHandler } from './action.interface';

class ActionRegistry {
  private handlers = new Map<string, ActionHandler>();

  register(handler: ActionHandler): void {
    if (this.handlers.has(handler.tipo)) {
      console.warn(`[ActionRegistry] Sobreescribiendo handler para tipo "${handler.tipo}"`);
    }
    this.handlers.set(handler.tipo, handler);
    console.log(`[ActionRegistry] Registrado: ${handler.tipo}`);
  }

  get(tipo: string): ActionHandler | undefined {
    return this.handlers.get(tipo);
  }

  listar(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// Singleton compartido por todo el proceso
export const actionRegistry = new ActionRegistry();
