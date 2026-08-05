// ─── Tipos globales del CRM Luz Holística ─────────────────────────────────────

export type Especialidad =
  | 'astrologia_tropical'
  | 'astrologia_vedica'
  | 'tarot'
  | 'constelaciones_familiares'
  | 'astrogenealogia'
  | 'reiki'
  | 'coaching_holistico'
  | 'numerologia'
  | 'otro';

export type NivelExperiencia =
  | 'principiante'   // 0-2 años
  | 'intermedio'     // 2-5 años
  | 'avanzado'       // 5-10 años
  | 'profesional';   // 10+ años

export type EstadoContacto =
  | 'prospecto'      // recién capturado
  | 'contactado'     // primer mensaje enviado
  | 'nurture'        // en secuencia de emails
  | 'cualificado'    // mostró interés real
  | 'cliente'        // ya compró
  | 'no_interesado'; // descartado

export type FuenteCaptura =
  | 'facebook'
  | 'telegram'
  | 'instagram'
  | 'linkedin'
  | 'directorio'
  | 'formulario_web'
  | 'referido'
  | 'manual'
  | 'scraping_google_maps';

export type TipoAccion =
  | 'email_enviado'
  | 'email_abierto'
  | 'click_link'
  | 'visita_landing'
  | 'respuesta'
  | 'nota_manual'
  | 'llamada'
  | 'trial_iniciado'
  | 'compra';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CrearContactoDTO {
  nombre?: string;
  email: string;
  telefono?: string;
  usuarioRedes?: string;
  especialidadPrimaria?: Especialidad;
  especialidadSecundaria?: Especialidad;
  nivelExperiencia?: NivelExperiencia;
  formacion?: string;
  certificaciones?: string[];
  pais?: string;
  ciudad?: string;
  region?: string;    // Estado/provincia/departamento
  zonaHoraria?: string;
  instagramUrl?: string;
  instagramSeguidores?: number;
  tiktokUrl?: string;
  tiktokSeguidores?: number;
  facebookUrl?: string;
  youtubeUrl?: string;
  webUrl?: string;
  telegramUsername?: string;
  fuente?: FuenteCaptura;
  etiquetas?: string[];
  notas?: string;
  consentimientoEmail?: boolean;
  fuenteConsentimiento?: string;
}

export interface ActualizarContactoDTO extends Partial<CrearContactoDTO> {
  estado?: EstadoContacto;
  leadScore?: number;
  proximosPasos?: string;
  proximaAccionFecha?: Date;
  mailerliteId?: string;
}

export interface FiltrosContacto {
  especialidad?: string;
  nivel?: string;
  pais?: string;
  estado?: string;
  minScore?: number;
  maxScore?: number;
  etiqueta?: string;
  fuente?: string;
  conConsentimiento?: boolean;
  busqueda?: string;
  page?: number;
  limit?: number;
  ordenarPor?: string;
  orden?: 'asc' | 'desc';
}

export interface RegistrarAccionDTO {
  contactoId: string;
  tipo: TipoAccion;
  descripcion?: string;
}

export interface ImportarCSVContacto {
  nombre?: string;
  email: string;
  telefono?: string;
  especialidad?: string;
  nivel?: string;
  pais?: string;
  ciudad?: string;
  fuente?: string;
  instagramUrl?: string;
  etiquetas?: string;
  notas?: string;
}

// ─── Respuestas de API ─────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  mensaje?: string;
}

export interface PaginatedResponse<T> {
  ok: boolean;
  data: T[];
  total: number;
  pagina: number;
  totalPaginas: number;
  limite: number;
}

// ─── Configuración de scoring ─────────────────────────────────────────────────

export const SCORING_CONFIG = {
  capturaInicial: 5,
  emailVisible: 5,
  especialidadConfirmada: 10,
  interaccion: 15,
  emailsAbiertos5: 20,        // por cada 5 emails abiertos
  visitaLanding: 10,
  clickEnlaceVenta: 30,
  respuestaRecibida: 25,
  trialIniciado: 40,
  compra: 100,
  emailsSinAbrir10: -20,      // penalización por 10 sin abrir
  MAX_SCORE: 100,
} as const;
