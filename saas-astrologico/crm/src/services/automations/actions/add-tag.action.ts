import { PrismaClient } from '@prisma/client';
import { ActionHandler, ActionContext, ActionResult } from '../action.interface';

const prisma = new PrismaClient();

export class AddTagAction implements ActionHandler {
  readonly tipo = 'add_tag';

  async execute(config: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const contactoId = ctx.contactoId ?? config.contactoId as string;
    const tag = config.tag as string;
    if (!contactoId || !tag) return { ok: false, tipo: this.tipo, error: 'contactoId y tag requeridos' };

    try {
      const contacto = await prisma.contacto.findUnique({ where: { id: contactoId } });
      if (!contacto) return { ok: false, tipo: this.tipo, error: `Contacto ${contactoId} no encontrado` };

      const tags: string[] = JSON.parse(contacto.etiquetas || '[]');
      if (!tags.includes(tag)) {
        tags.push(tag);
        await prisma.contacto.update({
          where: { id: contactoId },
          data: { etiquetas: JSON.stringify(tags), updatedAt: new Date() },
        });
      }
      return { ok: true, tipo: this.tipo, detalle: `Tag "${tag}" agregado a ${contactoId}` };
    } catch (err) {
      return { ok: false, tipo: this.tipo, error: (err as Error).message };
    }
  }
}

export class RemoveTagAction implements ActionHandler {
  readonly tipo = 'remove_tag';

  async execute(config: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const contactoId = ctx.contactoId ?? config.contactoId as string;
    const tag = config.tag as string;
    if (!contactoId || !tag) return { ok: false, tipo: this.tipo, error: 'contactoId y tag requeridos' };

    try {
      const contacto = await prisma.contacto.findUnique({ where: { id: contactoId } });
      if (!contacto) return { ok: false, tipo: this.tipo, error: `Contacto ${contactoId} no encontrado` };

      const tags: string[] = JSON.parse(contacto.etiquetas || '[]');
      const nuevasTags = tags.filter(t => t !== tag);
      await prisma.contacto.update({
        where: { id: contactoId },
        data: { etiquetas: JSON.stringify(nuevasTags), updatedAt: new Date() },
      });
      return { ok: true, tipo: this.tipo, detalle: `Tag "${tag}" removido de ${contactoId}` };
    } catch (err) {
      return { ok: false, tipo: this.tipo, error: (err as Error).message };
    }
  }
}
