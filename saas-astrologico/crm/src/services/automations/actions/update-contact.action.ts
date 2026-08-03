import { PrismaClient } from '@prisma/client';
import { ActionHandler, ActionContext, ActionResult } from '../action.interface';

const prisma = new PrismaClient();

export class UpdateContactAction implements ActionHandler {
  readonly tipo = 'update_contact';

  async execute(config: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const contactoId = ctx.contactoId ?? config.contactoId as string;
    if (!contactoId) return { ok: false, tipo: this.tipo, error: 'contactoId requerido' };

    const campo = config.campo as string;
    const valor = config.valor;
    if (!campo) return { ok: false, tipo: this.tipo, error: 'campo requerido en config' };

    try {
      await prisma.contacto.update({
        where: { id: contactoId },
        data: { [campo]: valor, updatedAt: new Date() },
      });
      return { ok: true, tipo: this.tipo, detalle: `Contacto ${contactoId}: ${campo} = ${valor}` };
    } catch (err) {
      return { ok: false, tipo: this.tipo, error: (err as Error).message };
    }
  }
}
