import { ActionHandler, ActionContext, ActionResult } from '../action.interface';

export class WebhookAction implements ActionHandler {
  readonly tipo = 'webhook';

  async execute(config: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const url    = config.url as string;
    const method = (config.method as string) ?? 'POST';
    const headers = (config.headers as Record<string, string>) ?? {};
    const body   = config.body ? JSON.stringify({ ...config.body, _context: ctx }) : JSON.stringify(ctx);

    if (!url) return { ok: false, tipo: this.tipo, error: 'url requerida en config' };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: ['GET', 'HEAD'].includes(method) ? undefined : body,
        signal: AbortSignal.timeout(10_000),
      });
      return { ok: res.ok, tipo: this.tipo, detalle: `HTTP ${res.status} → ${url}` };
    } catch (err) {
      return { ok: false, tipo: this.tipo, error: (err as Error).message };
    }
  }
}
