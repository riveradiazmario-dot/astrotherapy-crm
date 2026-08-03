// ─── Motor de automatizaciones ────────────────────────────────────────────────
//
// Flujo:
//   dispatchEvento(evento, payload)
//     → busca Automatizaciones activas para ese evento
//     → evalúa trigger_condiciones contra el payload
//     → obtiene la Secuencia asociada
//     → ejecuta los Pasos de la Secuencia en orden via ActionRegistry
//
// El motor no conoce ningún canal ni proveedor.
// La lógica de qué hace cada acción vive en los ActionHandlers registrados.

import { createClient } from '@supabase/supabase-js';
import { actionRegistry } from './action.registry';
import { ActionContext, ActionResult } from './action.interface';

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY no configurada');
  return createClient(process.env.SUPABASE_URL!, key);
}

// ─── Tipos internos ───────────────────────────────────────────────────────────
interface Automatizacion {
  id: string;
  nombre: string;
  trigger_condiciones: Record<string, unknown>;
  secuenciaId: string;
}

interface Paso {
  id: string;
  orden: number;
  tipo: string;
  config: Record<string, unknown>;
  condicion_skip: Record<string, unknown> | null;
  activo: boolean;
}

// ─── Evaluar condiciones del trigger ─────────────────────────────────────────
function cumpleCondiciones(
  condiciones: Record<string, unknown>,
  payload: Record<string, unknown>,
): boolean {
  if (!condiciones || Object.keys(condiciones).length === 0) return true;
  return Object.entries(condiciones).every(([k, v]) => payload[k] === v);
}

// ─── Evaluar condición de skip de un paso ────────────────────────────────────
function debeSkip(
  condicion: Record<string, unknown> | null,
  payload: Record<string, unknown>,
): boolean {
  if (!condicion || Object.keys(condicion).length === 0) return false;
  const { campo, operador, valor } = condicion as { campo: string; operador: string; valor: unknown };
  const actual = payload[campo];
  switch (operador) {
    case 'eq':  return actual === valor;
    case 'neq': return actual !== valor;
    case 'in':  return Array.isArray(valor) && valor.includes(actual);
    default:    return false;
  }
}

// ─── Ejecutar una Secuencia ───────────────────────────────────────────────────
async function ejecutarSecuencia(
  secuenciaId: string,
  ctx: ActionContext,
): Promise<{ estado: string; pasos: ActionResult[] }> {
  const sb = getSupabase();
  const { data: pasos } = await sb
    .from('secuencia_pasos')
    .select('*')
    .eq('secuenciaId', secuenciaId)
    .eq('activo', true)
    .order('orden');

  const resultados: ActionResult[] = [];
  let estado = 'completado';

  for (const paso of (pasos ?? []) as Paso[]) {
    if (debeSkip(paso.condicion_skip, ctx.payload)) {
      resultados.push({ ok: true, tipo: paso.tipo, detalle: 'skipped por condición' });
      continue;
    }

    const handler = actionRegistry.get(paso.tipo);
    if (!handler) {
      const res: ActionResult = { ok: false, tipo: paso.tipo, error: `Handler no registrado: ${paso.tipo}` };
      resultados.push(res);
      console.warn(`[Engine] ${res.error}`);
      estado = 'fallido';
      break;
    }

    const resultado = await handler.execute(paso.config, ctx);
    resultados.push(resultado);
    if (!resultado.ok) { estado = 'fallido'; break; }
  }

  return { estado, pasos: resultados };
}

// ─── Dispatch: punto de entrada público del motor ────────────────────────────
export async function dispatchEvento(
  evento: string,
  payload: Record<string, unknown>,
  organizacionId = 'org-luz-holistica',
): Promise<void> {
  const sb = getSupabase();

  // 1. Buscar automatizaciones activas para este evento
  const { data: autos } = await sb
    .from('automatizaciones')
    .select('id, nombre, trigger_condiciones, "secuenciaId"')
    .eq('trigger_evento', evento)
    .eq('activo', true)
    .eq('organizacionId', organizacionId);

  if (!autos?.length) return;

  const ctx: ActionContext = {
    contactoId: payload.contactoId as string | undefined,
    organizacionId,
    evento,
    payload,
  };

  for (const auto of autos as Automatizacion[]) {
    // 2. Evaluar condiciones del trigger
    if (!cumpleCondiciones(auto.trigger_condiciones, payload)) continue;

    // 3. Crear log
    const { data: log } = await sb
      .from('automatizacion_logs')
      .insert({
        automatizacionId: auto.id,
        secuenciaId: auto.secuenciaId,
        contactoId: ctx.contactoId,
        evento,
        contexto: payload,
        estado: 'en_progreso',
      })
      .select('id')
      .single();

    // 4. Ejecutar la secuencia asociada
    const { estado, pasos } = await ejecutarSecuencia(auto.secuenciaId, ctx);

    // 5. Actualizar log y estadísticas
    if (log?.id) {
      await sb.from('automatizacion_logs').update({ estado, pasos_ejecutados: pasos }).eq('id', log.id);
    }
    await sb.from('automatizaciones').update({
      total_ejecuciones: (auto as unknown as { total_ejecuciones: number }).total_ejecuciones + 1,
      ultima_ejecucion: new Date().toISOString(),
    }).eq('id', auto.id);
  }
}
