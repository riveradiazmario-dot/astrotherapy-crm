import { ActionHandler, ActionContext, ActionResult } from '../action.interface';

export class WaitAction implements ActionHandler {
  readonly tipo = 'wait';

  async execute(config: Record<string, unknown>, _ctx: ActionContext): Promise<ActionResult> {
    const ms = ((config.segundos as number) ?? 0) * 1000;
    if (ms > 0) await new Promise(r => setTimeout(r, ms));
    return { ok: true, tipo: this.tipo, detalle: `Esperó ${config.segundos ?? 0}s` };
  }
}
