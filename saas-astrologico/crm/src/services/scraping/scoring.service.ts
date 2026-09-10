// ─── Sistema de Scoring para Leads ────────────────────────────────────────────
// Calcula puntuación de calidad basada en múltiples factores

export interface ScoringConfig {
  minScore: number;
  verificadoBonus: number;
  followers1kBonus: number;
  followers10kBonus: number;
  emailBonus: number;
  engagementBonus: number;
  palabraCleveBonus: number;
  descripcionBonus: number;
  excluirBots: boolean;
  excluirInactivos: boolean;
}

export interface LeadScore {
  username: string;
  totalScore: number;
  detalles: {
    verificado: number;
    followers: number;
    email: number;
    engagement: number;
    palabraClave: number;
    descripcion: number;
    esBot: boolean;
    esInactivo: boolean;
  };
  etiqueta: 'early_adopter' | 'caliente' | 'frio' | 'potencial_bot' | 'sin_contacto';
  recomendacion: string;
}

// Configuración por defecto
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  minScore: 30,
  verificadoBonus: 10,
  followers1kBonus: 5,
  followers10kBonus: 15,
  emailBonus: 10,
  engagementBonus: 5,
  palabraCleveBonus: 10,
  descripcionBonus: 5,
  excluirBots: true,
  excluirInactivos: true,
};

/**
 * Calcula puntuación de un lead de Instagram
 */
export function calcularScoreInstagram(
  perfil: {
    username: string;
    seguidores?: number;
    siguiendo?: number;
    publicaciones?: number;
    esVerificado?: boolean;
    esBusiness?: boolean;
    bio?: string;
    emailEnBio?: string;
    especialidadDetectada?: string;
  },
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): LeadScore {
  let score = 0;
  const detalles = {
    verificado: 0,
    followers: 0,
    email: 0,
    engagement: 0,
    palabraClave: 0,
    descripcion: 0,
    esBot: false,
    esInactivo: false,
  };

  // Verificación
  if (perfil.esVerificado) {
    score += config.verificadoBonus;
    detalles.verificado = config.verificadoBonus;
  }

  // Followers
  const followers = perfil.seguidores ?? 0;
  if (followers >= 10000) {
    score += config.followers10kBonus;
    detalles.followers = config.followers10kBonus;
  } else if (followers >= 1000) {
    score += config.followers1kBonus;
    detalles.followers = config.followers1kBonus;
  }

  // Email en bio
  if (perfil.emailEnBio) {
    score += config.emailBonus;
    detalles.email = config.emailBonus;
  }

  // Engagement (aproximado: publicaciones / followers ratio)
  if (perfil.publicaciones && followers > 0) {
    const engagementRatio = perfil.publicaciones / followers;
    if (engagementRatio > 0.01) {
      // Más de 1% de posts por seguidor = engagement alto
      score += config.engagementBonus;
      detalles.engagement = config.engagementBonus;
    }
  }

  // Palabra clave (especialidad detectada)
  if (perfil.especialidadDetectada) {
    score += config.palabraCleveBonus;
    detalles.palabraClave = config.palabraCleveBonus;
  }

  // Descripción completa (bio)
  if (perfil.bio && perfil.bio.length > 20) {
    score += config.descripcionBonus;
    detalles.descripcion = config.descripcionBonus;
  }

  // Detección de bots
  if (config.excluirBots) {
    detalles.esBot = detectarBot(perfil);
    if (detalles.esBot) score = Math.max(0, score - 50); // Castigo severo
  }

  // Detección de inactivos
  if (config.excluirInactivos) {
    detalles.esInactivo = detectarInactivo(perfil);
    if (detalles.esInactivo) score = Math.max(0, score - 30);
  }

  // Etiquetado
  let etiqueta: LeadScore['etiqueta'] = 'frio';
  let recomendacion = 'Lead sin características destacadas';

  if (detalles.esBot) {
    etiqueta = 'potencial_bot';
    recomendacion = 'Posible bot o cuenta sospechosa';
  } else if (!perfil.emailEnBio) {
    etiqueta = 'sin_contacto';
    recomendacion = 'No hay email o contacto disponible en bio';
  } else if (score >= 50) {
    etiqueta = 'early_adopter';
    recomendacion = 'Lead de alta calidad, contacto prioritario';
  } else if (score >= 30) {
    etiqueta = 'caliente';
    recomendacion = 'Lead potencial, vale la pena contactar';
  }

  return {
    username: perfil.username,
    totalScore: score,
    detalles,
    etiqueta,
    recomendacion,
  };
}

/**
 * Detecta si una cuenta parece ser bot
 */
function detectarBot(perfil: {
  seguidores?: number;
  siguiendo?: number;
  publicaciones?: number;
}): boolean {
  const followers = perfil.seguidores ?? 0;
  const siguiendo = perfil.siguiendo ?? 0;
  const publicaciones = perfil.publicaciones ?? 0;

  // Ratio sospechoso de siguiendo/seguidores
  if (followers > 100 && siguiendo > 0) {
    const ratio = siguiendo / followers;
    if (ratio > 10) return true; // Sigue 10x más de lo que lo siguen
  }

  // Sin publicaciones pero muchos seguidores (muy sospechoso)
  if (followers > 1000 && publicaciones === 0) return true;

  // Follower count muy bajo pero muchas publicaciones (spam)
  if (followers < 50 && publicaciones > 100) return true;

  return false;
}

/**
 * Detecta si una cuenta está inactiva
 */
function detectarInactivo(perfil: {
  publicaciones?: number;
}): boolean {
  const publicaciones = perfil.publicaciones ?? 0;

  // Menos de 5 publicaciones = cuenta muy nueva o inactiva
  if (publicaciones < 5) return true;

  return false;
}

/**
 * Calcula score para TikTok
 */
export function calcularScoreTikTok(
  perfil: {
    username: string;
    seguidores?: number;
    videoCount?: number;
    bio?: string;
    esVerificado?: boolean;
    especialidadDetectada?: string;
  },
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): LeadScore {
  let score = 0;
  const detalles = {
    verificado: 0,
    followers: 0,
    email: 0,
    engagement: 0,
    palabraClave: 0,
    descripcion: 0,
    esBot: false,
    esInactivo: false,
  };

  // Verificación
  if (perfil.esVerificado) {
    score += config.verificadoBonus;
    detalles.verificado = config.verificadoBonus;
  }

  // Followers (thresholds más bajos para TikTok)
  const followers = perfil.seguidores ?? 0;
  if (followers >= 100000) {
    score += config.followers10kBonus;
    detalles.followers = config.followers10kBonus;
  } else if (followers >= 10000) {
    score += config.followers1kBonus;
    detalles.followers = config.followers1kBonus;
  }

  // Palabra clave
  if (perfil.especialidadDetectada) {
    score += config.palabraCleveBonus;
    detalles.palabraClave = config.palabraCleveBonus;
  }

  // Descripción
  if (perfil.bio && perfil.bio.length > 10) {
    score += config.descripcionBonus;
    detalles.descripcion = config.descripcionBonus;
  }

  // Detectar inactivos
  if (config.excluirInactivos) {
    const videos = perfil.videoCount ?? 0;
    if (videos < 3) {
      detalles.esInactivo = true;
      score = Math.max(0, score - 30);
    }
  }

  // Etiquetado
  let etiqueta: LeadScore['etiqueta'] = 'frio';
  let recomendacion = 'Lead sin características destacadas';

  if (score >= 40) {
    etiqueta = 'early_adopter';
    recomendacion = 'Creator verificado con potencial';
  } else if (score >= 20) {
    etiqueta = 'caliente';
    recomendacion = 'Creator con potencial';
  }

  return {
    username: perfil.username,
    totalScore: score,
    detalles,
    etiqueta,
    recomendacion,
  };
}
