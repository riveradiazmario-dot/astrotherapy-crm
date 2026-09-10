// ─── Servicio de Filtrado Automático de Leads ─────────────────────────────────
// Aplica reglas de filtrado a leads crudos

import { calcularScoreInstagram, calcularScoreTikTok, ScoringConfig, DEFAULT_SCORING_CONFIG } from './scoring.service';

export interface FiltroConfig extends ScoringConfig {
  excluirSinContacto: boolean;
  excluirSinEspecialidad: boolean;
  pais?: string;
  especialidadesAceptadas?: string[];
}

export const DEFAULT_FILTRO_CONFIG: FiltroConfig = {
  ...DEFAULT_SCORING_CONFIG,
  excluirSinContacto: true,
  excluirSinEspecialidad: false,
};

export interface LeadFiltrado {
  incluido: boolean;
  razonExclusión?: string;
  puntaje: number;
  etiqueta: string;
  recomendacion: string;
}

/**
 * Filtra un lead de Instagram según configuración
 */
export function filtrarLeadInstagram(
  perfil: any,
  config: FiltroConfig = DEFAULT_FILTRO_CONFIG,
): LeadFiltrado {
  const score = calcularScoreInstagram(perfil, config);

  // Verificar puntaje mínimo
  if (score.totalScore < config.minScore) {
    return {
      incluido: false,
      razonExclusión: `Puntaje insuficiente: ${score.totalScore}/${config.minScore}`,
      puntaje: score.totalScore,
      etiqueta: score.etiqueta,
      recomendacion: score.recomendacion,
    };
  }

  // Excluir bots
  if (config.excluirBots && score.detalles.esBot) {
    return {
      incluido: false,
      razonExclusión: 'Cuenta detectada como bot',
      puntaje: score.totalScore,
      etiqueta: score.etiqueta,
      recomendacion: score.recomendacion,
    };
  }

  // Excluir inactivos
  if (config.excluirInactivos && score.detalles.esInactivo) {
    return {
      incluido: false,
      razonExclusión: 'Cuenta inactiva',
      puntaje: score.totalScore,
      etiqueta: score.etiqueta,
      recomendacion: score.recomendacion,
    };
  }

  // Excluir sin contacto
  if (config.excluirSinContacto && !perfil.emailEnBio) {
    return {
      incluido: false,
      razonExclusión: 'Sin email o contacto en bio',
      puntaje: score.totalScore,
      etiqueta: score.etiqueta,
      recomendacion: score.recomendacion,
    };
  }

  // Excluir sin especialidad detectada
  if (config.excluirSinEspecialidad && !perfil.especialidadDetectada) {
    return {
      incluido: false,
      razonExclusión: 'Especialidad no detectada',
      puntaje: score.totalScore,
      etiqueta: score.etiqueta,
      recomendacion: score.recomendacion,
    };
  }

  // Filtrar por especialidades aceptadas (si está configurado)
  if (config.especialidadesAceptadas && config.especialidadesAceptadas.length > 0) {
    if (!perfil.especialidadDetectada || !config.especialidadesAceptadas.includes(perfil.especialidadDetectada)) {
      return {
        incluido: false,
        razonExclusión: `Especialidad no en lista aceptada: ${perfil.especialidadDetectada}`,
        puntaje: score.totalScore,
        etiqueta: score.etiqueta,
        recomendacion: score.recomendacion,
      };
    }
  }

  // Si llegó aquí, el lead pasa todos los filtros
  return {
    incluido: true,
    puntaje: score.totalScore,
    etiqueta: score.etiqueta,
    recomendacion: score.recomendacion,
  };
}

/**
 * Filtra un lead de TikTok
 */
export function filtrarLeadTikTok(
  perfil: any,
  config: FiltroConfig = DEFAULT_FILTRO_CONFIG,
): LeadFiltrado {
  const score = calcularScoreTikTok(perfil, config);

  if (score.totalScore < config.minScore) {
    return {
      incluido: false,
      razonExclusión: `Puntaje insuficiente: ${score.totalScore}/${config.minScore}`,
      puntaje: score.totalScore,
      etiqueta: score.etiqueta,
      recomendacion: score.recomendacion,
    };
  }

  if (config.excluirInactivos && score.detalles.esInactivo) {
    return {
      incluido: false,
      razonExclusión: 'Cuenta inactiva',
      puntaje: score.totalScore,
      etiqueta: score.etiqueta,
      recomendacion: score.recomendacion,
    };
  }

  if (config.excluirSinEspecialidad && !perfil.especialidadDetectada) {
    return {
      incluido: false,
      razonExclusión: 'Especialidad no detectada',
      puntaje: score.totalScore,
      etiqueta: score.etiqueta,
      recomendacion: score.recomendacion,
    };
  }

  return {
    incluido: true,
    puntaje: score.totalScore,
    etiqueta: score.etiqueta,
    recomendacion: score.recomendacion,
  };
}

/**
 * Aplica filtrado a un lote de leads
 */
export function filtrarLote(
  leads: any[],
  fuente: 'instagram' | 'tiktok' | 'telegram',
  config: FiltroConfig = DEFAULT_FILTRO_CONFIG,
): {
  incluidos: any[];
  excluidos: any[];
  estadisticas: {
    total: number;
    incluidos: number;
    excluidos: number;
    tasaAprobacion: number;
    scorPromedio: number;
  };
} {
  const incluidos: any[] = [];
  const excluidos: any[] = [];
  let totalScore = 0;

  for (const lead of leads) {
    let resultado;

    if (fuente === 'instagram') {
      resultado = filtrarLeadInstagram(lead, config);
    } else if (fuente === 'tiktok') {
      resultado = filtrarLeadTikTok(lead, config);
    } else {
      // Telegram: filtrado más simple por ahora
      resultado = {
        incluido: lead.especialidadDetectada ? true : false,
        puntaje: 25,
        etiqueta: 'caliente',
        recomendacion: 'Lead de Telegram',
      };
    }

    totalScore += resultado.puntaje;

    if (resultado.incluido) {
      incluidos.push({
        ...lead,
        _score: resultado.puntaje,
        _etiqueta: resultado.etiqueta,
        _recomendacion: resultado.recomendacion,
      });
    } else {
      excluidos.push({
        ...lead,
        _razonExclusión: resultado.razonExclusión,
        _score: resultado.puntaje,
      });
    }
  }

  return {
    incluidos,
    excluidos,
    estadisticas: {
      total: leads.length,
      incluidos: incluidos.length,
      excluidos: excluidos.length,
      tasaAprobacion: leads.length > 0 ? Math.round((incluidos.length / leads.length) * 100) : 0,
      scorPromedio: leads.length > 0 ? Math.round(totalScore / leads.length) : 0,
    },
  };
}
