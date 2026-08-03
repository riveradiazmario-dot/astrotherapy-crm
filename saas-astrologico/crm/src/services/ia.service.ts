// ─── Servicio IA del CRM ────────────────────────────────────────────────────
//
// Tres capacidades:
//   1. Auto-scoring: recalcular leadScore basado en historial completo
//   2. Resumen de contacto: generar perfil ejecutivo
//   3. Sugerencia de próximo paso: recomendar acción basada en estado + historial
//
// Modo actual: reglas deterministas (funciona sin API key de IA)
// Preparado para: conectar OpenAI/Anthropic cuando se agregue la key
//
// El servicio NUNCA modifica datos — solo lee y devuelve recomendaciones.
// La decisión de aplicar cambios queda en el controller/ruta.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_KEY no configurada');
    _supabase = createClient(process.env.SUPABASE_URL!, key);
  }
  return _supabase;
}

// ─── Tipos ──────────────────────────────────────────────────────────────────
export interface ScoreResult {
  scoreActual: number;
  scoreCalculado: number;
  delta: number;
  factores: { factor: string; puntos: number; detalle: string }[];
}

export interface ResumenContacto {
  perfil: string;
  etapa: string;
  historial: string;
  riesgo: 'bajo' | 'medio' | 'alto';
  valor: 'bajo' | 'medio' | 'alto';
}

export interface Sugerencia {
  accion: string;
  prioridad: 'alta' | 'media' | 'baja';
  razon: string;
  plantilla?: string;  // template de email/mensaje sugerido
}

// ─── Tablas de puntuación ───────────────────────────────────────────────────
const SCORE_POR_ACCION: Record<string, number> = {
  captura: 5,
  email_abierto: 3,
  email_click: 5,
  visita_landing: 2,
  click_venta: 8,
  respuesta: 10,
  demo_agendada: 25,
  trial_iniciado: 20,
  compra: 40,
  sin_interaccion: -2,
  nota: 0,
};

const SCORE_POR_ETIQUETA: Record<string, number> = {
  cliente_pagado: 30,
  membresia_activa: 20,
  membresia_cancelada: -10,
  demo_astrotherapy: 15,
  calendly: 10,
};

// ─── 1. Auto-scoring ────────────────────────────────────────────────────────
export async function calcularScore(contactoId: string): Promise<ScoreResult> {
  const sb = getSupabase();

  const { data: contacto } = await sb
    .from('Contacto')
    .select('leadScore, etiquetas, estado, interacciones, ultimaInteraccion, createdAt')
    .eq('id', contactoId)
    .single();

  if (!contacto) throw new Error('Contacto no encontrado');

  const { data: acciones } = await sb
    .from('Accion')
    .select('tipo, puntosAplicados, createdAt')
    .eq('contactoId', contactoId)
    .order('createdAt', { ascending: false })
    .limit(50);

  const factores: ScoreResult['factores'] = [];
  let score = 0;

  // Factor 1: acciones históricas
  const accionesRecientes = (acciones ?? []).filter(a => {
    const dias = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return dias <= 90;
  });

  for (const a of accionesRecientes) {
    const pts = SCORE_POR_ACCION[a.tipo] ?? 0;
    if (pts !== 0) {
      score += pts;
      factores.push({ factor: `accion:${a.tipo}`, puntos: pts, detalle: a.tipo });
    }
  }

  // Factor 2: etiquetas
  const etiquetas = JSON.parse(contacto.etiquetas || '[]') as string[];
  for (const et of etiquetas) {
    const pts = SCORE_POR_ETIQUETA[et] ?? 0;
    if (pts !== 0) {
      score += pts;
      factores.push({ factor: `etiqueta:${et}`, puntos: pts, detalle: et });
    }
  }

  // Factor 3: recencia (decay)
  if (contacto.ultimaInteraccion) {
    const diasSinContacto = (Date.now() - new Date(contacto.ultimaInteraccion).getTime()) / (1000 * 60 * 60 * 24);
    if (diasSinContacto > 30) {
      const decay = -Math.floor(diasSinContacto / 15);
      score += decay;
      factores.push({ factor: 'recencia', puntos: decay, detalle: `${Math.floor(diasSinContacto)} días sin interacción` });
    }
  }

  // Factor 4: estado actual
  const bonusEstado: Record<string, number> = { cliente: 20, cualificado: 10, contactado: 5, nurture: 3, prospecto: 0, no_interesado: -15 };
  const ptsEstado = bonusEstado[contacto.estado] ?? 0;
  if (ptsEstado !== 0) {
    score += ptsEstado;
    factores.push({ factor: 'estado', puntos: ptsEstado, detalle: contacto.estado });
  }

  const scoreCalculado = Math.max(0, Math.min(100, score));

  return {
    scoreActual: contacto.leadScore ?? 0,
    scoreCalculado,
    delta: scoreCalculado - (contacto.leadScore ?? 0),
    factores,
  };
}

// ─── 2. Resumen de contacto ─────────────────────────────────────────────────
export async function generarResumen(contactoId: string): Promise<ResumenContacto> {
  const sb = getSupabase();

  const { data: contacto } = await sb
    .from('Contacto')
    .select('*')
    .eq('id', contactoId)
    .single();

  if (!contacto) throw new Error('Contacto no encontrado');

  const { data: acciones } = await sb
    .from('Accion')
    .select('tipo, descripcion, createdAt')
    .eq('contactoId', contactoId)
    .order('createdAt', { ascending: false })
    .limit(20);

  const { count: totalConversaciones } = await sb
    .from('conversaciones')
    .select('id', { count: 'exact', head: true })
    .eq('contactoId', contactoId);

  const etiquetas = JSON.parse(contacto.etiquetas || '[]') as string[];
  const tieneCompra = etiquetas.includes('cliente_pagado');
  const tieneMembresia = etiquetas.includes('membresia_activa');
  const diasRegistrado = Math.floor((Date.now() - new Date(contacto.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const diasSinContacto = contacto.ultimaInteraccion
    ? Math.floor((Date.now() - new Date(contacto.ultimaInteraccion).getTime()) / (1000 * 60 * 60 * 24))
    : diasRegistrado;

  // Perfil
  const especialidad = contacto.especialidadPrimaria !== 'otro' ? contacto.especialidadPrimaria : null;
  const perfil = [
    contacto.nombre ?? 'Sin nombre',
    especialidad ? `especialidad: ${especialidad}` : null,
    contacto.pais ? `país: ${contacto.pais}` : null,
    `registrado hace ${diasRegistrado} días`,
    `${contacto.interacciones ?? 0} interacciones`,
    totalConversaciones ? `${totalConversaciones} conversaciones` : null,
  ].filter(Boolean).join(' | ');

  // Historial resumido
  const accionesResumen = (acciones ?? []).slice(0, 5).map(a =>
    `${new Date(a.createdAt).toLocaleDateString('es-MX')}: ${a.descripcion ?? a.tipo}`
  ).join('\n');

  // Riesgo
  let riesgo: ResumenContacto['riesgo'] = 'bajo';
  if (diasSinContacto > 60) riesgo = 'alto';
  else if (diasSinContacto > 30) riesgo = 'medio';
  if (etiquetas.includes('membresia_cancelada')) riesgo = 'alto';

  // Valor
  let valor: ResumenContacto['valor'] = 'bajo';
  if (tieneCompra || tieneMembresia) valor = 'alto';
  else if (contacto.leadScore >= 40) valor = 'medio';

  return {
    perfil,
    etapa: contacto.estado,
    historial: accionesResumen || 'Sin acciones registradas',
    riesgo,
    valor,
  };
}

// ─── 3. Sugerencia de próximo paso ──────────────────────────────────────────
export async function sugerirProximoPaso(contactoId: string): Promise<Sugerencia[]> {
  const sb = getSupabase();

  const { data: contacto } = await sb
    .from('Contacto')
    .select('nombre, email, estado, leadScore, etiquetas, ultimaInteraccion, fuente, interacciones')
    .eq('id', contactoId)
    .single();

  if (!contacto) throw new Error('Contacto no encontrado');

  const etiquetas = JSON.parse(contacto.etiquetas || '[]') as string[];
  const diasSinContacto = contacto.ultimaInteraccion
    ? Math.floor((Date.now() - new Date(contacto.ultimaInteraccion).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const nombre = contacto.nombre ?? 'colega';
  const sugerencias: Sugerencia[] = [];

  // Regla 1: Lead sin contactar
  if (contacto.estado === 'prospecto' && (contacto.interacciones ?? 0) <= 1) {
    sugerencias.push({
      accion: 'Enviar email de introducción',
      prioridad: 'alta',
      razon: 'Lead nuevo sin contactar',
      plantilla: `Hola ${nombre}, soy Mario del Instituto de Astrología Terapéutica. Vi que te registraste y quería presentarme personalmente. ¿Te gustaría agendar una demo gratuita de 30 minutos?`,
    });
  }

  // Regla 2: Contactado pero sin demo
  if (contacto.estado === 'contactado' && !etiquetas.includes('demo_astrotherapy') && !etiquetas.includes('calendly')) {
    sugerencias.push({
      accion: 'Invitar a demo gratuita',
      prioridad: 'alta',
      razon: 'Contactado pero no ha agendado demo',
      plantilla: `${nombre}, ¿te gustaría ver AstroTherapy Pro en acción? Agenda tu demo gratuita de 30 minutos aquí: https://calendly.com/bioastrologia/demo-de-astrotherapy-pro`,
    });
  }

  // Regla 3: Hizo demo pero no compró
  if (etiquetas.includes('demo_astrotherapy') && !etiquetas.includes('cliente_pagado')) {
    sugerencias.push({
      accion: 'Seguimiento post-demo',
      prioridad: 'alta',
      razon: 'Hizo demo pero no ha convertido',
      plantilla: `${nombre}, ¿cómo te sentiste con la demo? ¿Tienes alguna duda sobre cómo AstroTherapy Pro puede ayudarte en tu práctica?`,
    });
  }

  // Regla 4: Sin contacto > 14 días
  if (diasSinContacto > 14 && contacto.estado !== 'no_interesado' && contacto.estado !== 'cliente') {
    sugerencias.push({
      accion: 'Re-engagement',
      prioridad: diasSinContacto > 30 ? 'alta' : 'media',
      razon: `${diasSinContacto} días sin interacción`,
      plantilla: `${nombre}, han pasado unos días y quería saber cómo va tu práctica. ¿Hay algo en lo que pueda ayudarte?`,
    });
  }

  // Regla 5: Cliente con membresía — nurture
  if (etiquetas.includes('membresia_activa') && diasSinContacto > 21) {
    sugerencias.push({
      accion: 'Check-in con miembro activo',
      prioridad: 'media',
      razon: 'Miembro activo sin contacto reciente',
      plantilla: `${nombre}, ¿cómo vas con tu membresía del Círculo? ¿Necesitas ayuda con algo?`,
    });
  }

  // Regla 6: Membresía cancelada — win-back
  if (etiquetas.includes('membresia_cancelada')) {
    sugerencias.push({
      accion: 'Campaña win-back',
      prioridad: 'alta',
      razon: 'Membresía cancelada — oportunidad de recuperación',
      plantilla: `${nombre}, lamento que hayas decidido pausar tu membresía. Me encantaría saber qué podríamos mejorar. ¿Tienes 5 minutos para platicar?`,
    });
  }

  // Regla 7: Score alto sin compra
  if ((contacto.leadScore ?? 0) >= 50 && !etiquetas.includes('cliente_pagado')) {
    sugerencias.push({
      accion: 'Cerrar venta',
      prioridad: 'alta',
      razon: `Score alto (${contacto.leadScore}) sin compra — listo para convertir`,
    });
  }

  // Si no hay sugerencias específicas
  if (sugerencias.length === 0) {
    sugerencias.push({
      accion: 'Mantener relación',
      prioridad: 'baja',
      razon: 'Contacto estable, sin acciones urgentes',
    });
  }

  return sugerencias;
}

// ─── Aplicar score calculado ────────────────────────────────────────────────
export async function aplicarScore(contactoId: string): Promise<ScoreResult> {
  const result = await calcularScore(contactoId);
  if (result.delta !== 0) {
    const sb = getSupabase();
    await sb.from('Contacto').update({ leadScore: result.scoreCalculado }).eq('id', contactoId);
  }
  return result;
}

// ─── Batch: recalcular scores de todos los contactos ────────────────────────
export async function recalcularScoresGlobal(organizacionId = 'org-luz-holistica'): Promise<{ total: number; actualizados: number }> {
  const sb = getSupabase();
  const { data: contactos } = await sb
    .from('Contacto')
    .select('id')
    .eq('organizacionId', organizacionId);

  let actualizados = 0;
  for (const c of contactos ?? []) {
    const result = await aplicarScore(c.id);
    if (result.delta !== 0) actualizados++;
  }

  return { total: contactos?.length ?? 0, actualizados };
}
