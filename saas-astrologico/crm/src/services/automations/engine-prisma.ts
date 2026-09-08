// ─── Motor de automatizaciones (PostgreSQL/Prisma) ────────────────────────────
import { PrismaClient } from '@prisma/client';
import { actionRegistry } from './action.registry';
import { ActionContext, ActionResult } from './action.interface';

const prisma = new PrismaClient();

interface CondicionEvaluacion {
  campo: string;
  operador: 'eq' | 'neq' | 'in' | 'gt' | 'lt';
  valor: unknown;
}

export async function dispatchEvento(
  evento: string,
  payload: Record<string, unknown>,
  organizacionId = 'org-luz-holistica',
): Promise<{ ejecutadas: number; errores: string[] }> {
  const errores: string[] = [];
  let ejecutadas = 0;

  try {
    // Buscar automatizaciones activas para este evento
    const automatizaciones = await prisma.automatizacion.findMany({
      where: {
        trigger_evento: evento,
        activo: true,
        organizacionId,
      },
      include: {
        secuencia: {
          include: {
            pasos: {
              where: { activo: true },
              orderBy: { orden: 'asc' },
            },
          },
        },
      },
    });

    if (automatizaciones.length === 0) return { ejecutadas: 0, errores: [] };

    for (const auto of automatizaciones) {
      try {
        // Evaluar condiciones del trigger
        if (auto.trigger_condiciones) {
          const condiciones = auto.trigger_condiciones as Record<string, unknown>;
          const cumple = Object.entries(condiciones).every(([k, v]) => payload[k] === v);
          if (!cumple) continue;
        }

        // Crear log
        const log = await prisma.automatizacionLog.create({
          data: {
            automatizacionId: auto.id,
            secuenciaId: auto.secuenciaId,
            contactoId: (payload.contactoId as string) || undefined,
            evento,
            contexto: payload as any,
            estado: 'en_progreso',
          },
        });

        // Ejecutar secuencia
        const ctx: ActionContext = {
          contactoId: (payload.contactoId as string) || undefined,
          organizacionId,
          evento,
          payload,
        };

        const resultados: ActionResult[] = [];
        let estadoFinal = 'completado';

        for (const paso of auto.secuencia.pasos) {
          // Evaluar skip
          if (paso.condicion_skip) {
            const cond = paso.condicion_skip as unknown as CondicionEvaluacion;
            const actual = payload[cond.campo];
            let debe_skip = false;

            switch (cond.operador) {
              case 'eq':
                debe_skip = actual === cond.valor;
                break;
              case 'neq':
                debe_skip = actual !== cond.valor;
                break;
              case 'in':
                debe_skip =
                  Array.isArray(cond.valor) && cond.valor.includes(actual);
                break;
              default:
                break;
            }

            if (debe_skip) {
              resultados.push({
                ok: true,
                tipo: paso.tipo,
                detalle: 'skipped por condición',
              });
              continue;
            }
          }

          // Ejecutar acción
          const handler = actionRegistry.get(paso.tipo);
          if (!handler) {
            const res: ActionResult = {
              ok: false,
              tipo: paso.tipo,
              error: `Handler no registrado: ${paso.tipo}`,
            };
            resultados.push(res);
            console.warn(`[Engine] ${res.error}`);
            estadoFinal = 'fallido';
            break;
          }

          const config = paso.config as Record<string, unknown>;
          const resultado = await handler.execute(config, ctx);
          resultados.push(resultado);

          if (!resultado.ok) {
            estadoFinal = 'fallido';
            break;
          }
        }

        // Actualizar log
        await prisma.automatizacionLog.update({
          where: { id: log.id },
          data: {
            estado: estadoFinal as any,
            pasos_ejecutados: resultados as any,
          },
        });

        // Actualizar estadísticas
        await prisma.automatizacion.update({
          where: { id: auto.id },
          data: {
            total_ejecuciones: { increment: 1 },
            ultima_ejecucion: new Date(),
          },
        });

        ejecutadas++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        errores.push(`Automatización ${auto.id}: ${msg}`);
        console.error(`[Engine Error] ${msg}`);
      }
    }

    return { ejecutadas, errores };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error en dispatchEvento';
    return { ejecutadas: 0, errores: [msg] };
  }
}

export async function listarAutomatizaciones(
  organizacionId = 'org-luz-holistica',
) {
  return prisma.automatizacion.findMany({
    where: { organizacionId },
    include: {
      secuencia: {
        include: { pasos: { orderBy: { orden: 'asc' } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
