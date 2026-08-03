// ─── TikTok Search Scraper via Apify ─────────────────────────────────────────
// Actor: clockworks~tiktok-scraper  (gratuito en plan FREE con créditos incluidos)
// Extrae perfiles de creadores a partir de búsquedas por hashtag o keyword.

import { ejecutarActor } from './apify.service';

// ─── Tipos de respuesta del actor ────────────────────────────────────────────

export interface TikTokPerfil {
  // Campos que devuelve el actor de Apify
  authorMeta?: {
    id?: string;
    name?: string;           // username ej. "astro_mario"
    nickName?: string;       // nombre visible ej. "Mario Rivera Astrólogo"
    verified?: boolean;
    signature?: string;      // bio
    bioLink?: string;
    fans?: number;
    following?: number;
    video?: number;
    heart?: number;
    avatar?: string;
  };
  // campos de video (el actor devuelve videos, no solo perfiles)
  id?: string;
  text?: string;
  diggCount?: number;
  shareCount?: number;
  playCount?: number;
  commentCount?: number;
  createTime?: number;
  webVideoUrl?: string;
}

export interface TikTokContacto {
  fuente: 'tiktok';
  username: string;
  nombreDisplay: string;
  bio: string;
  seguidores: number;
  siguiendo: number;
  videos: number;
  likes: number;
  verificado: boolean;
  bioLink?: string;
  avatar?: string;
  perfilUrl: string;
  emailEnBio?: string;
  telefonoBio?: string;
  especialidadDetectada?: string;
  videoDestacado?: {
    texto: string;
    plays: number;
    likes: number;
    url: string;
  };
}

// ─── Detección de especialidad ────────────────────────────────────────────────

const ESPECIALIDADES: Record<string, string[]> = {
  'astrologia': ['astrólog', 'astrolog', 'carta natal', 'horóscopo', 'astro'],
  'tarot': ['tarot', 'tarotista', 'oracl', 'cartas'],
  'constelaciones': ['constelac', 'bert hellinger'],
  'reiki': ['reiki', 'energétic', 'sanación'],
  'numerologia': ['numerolog'],
  'psicologa': ['psicólog', 'terapia', 'mental health'],
  'coaching': ['coach', 'mentoría', 'mentor'],
  'holistico': ['holístic', 'holistic', 'bienestar', 'wellness'],
  'chamanic': ['chamanis', 'shamani', 'medicina ancestral'],
};

function detectarEspecialidad(texto: string): string | undefined {
  const t = texto.toLowerCase();
  for (const [esp, kws] of Object.entries(ESPECIALIDADES)) {
    if (kws.some(kw => t.includes(kw))) return esp;
  }
  return undefined;
}

function extraerEmail(texto: string): string | undefined {
  const m = texto.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : undefined;
}

function extraerTelefono(texto: string): string | undefined {
  const m = texto.match(/(\+?[\d\s\-().]{10,15})/);
  return m ? m[0].trim() : undefined;
}

// ─── Deduplicar por username ──────────────────────────────────────────────────

function deduplicar(items: TikTokPerfil[]): Map<string, TikTokPerfil> {
  const map = new Map<string, TikTokPerfil>();
  for (const item of items) {
    const username = item.authorMeta?.name;
    if (!username) continue;
    // Guardar siempre la versión con más seguidores
    const existing = map.get(username);
    const fans = item.authorMeta?.fans ?? 0;
    if (!existing || (existing.authorMeta?.fans ?? 0) < fans) {
      map.set(username, item);
    }
  }
  return map;
}

// ─── Buscar por keyword/hashtag ───────────────────────────────────────────────

export async function buscarTikTok(
  query: string,
  maxVideos: number = 50,
): Promise<TikTokContacto[]> {

  const items = await ejecutarActor<TikTokPerfil>(
    'clockworks~tiktok-scraper',
    {
      searchQueries: [query],
      maxVideosPerQuery: maxVideos,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
    },
    180, // 3 min timeout
  );

  const perfilesMap = deduplicar(items);
  const resultado: TikTokContacto[] = [];

  for (const [username, item] of perfilesMap) {
    const a = item.authorMeta!;
    const bio = a.signature ?? '';

    const contacto: TikTokContacto = {
      fuente: 'tiktok',
      username,
      nombreDisplay: a.nickName ?? username,
      bio,
      seguidores: a.fans ?? 0,
      siguiendo: a.following ?? 0,
      videos: a.video ?? 0,
      likes: a.heart ?? 0,
      verificado: a.verified ?? false,
      bioLink: a.bioLink,
      avatar: a.avatar,
      perfilUrl: `https://www.tiktok.com/@${username}`,
      emailEnBio: extraerEmail(bio),
      telefonoBio: extraerTelefono(bio),
      especialidadDetectada: detectarEspecialidad(bio + ' ' + (a.nickName ?? '')),
      videoDestacado: item.text ? {
        texto: item.text,
        plays: item.playCount ?? 0,
        likes: item.diggCount ?? 0,
        url: item.webVideoUrl ?? `https://www.tiktok.com/@${username}`,
      } : undefined,
    };

    resultado.push(contacto);
  }

  // Ordenar por seguidores descendente
  resultado.sort((a, b) => b.seguidores - a.seguidores);

  return resultado;
}

// ─── Convertir a formato importable por el CRM ───────────────────────────────

export function tiktokAContactoCRM(t: TikTokContacto, organizacionId: string) {
  return {
    nombre: t.nombreDisplay,
    email: t.emailEnBio ?? null,
    telefono: t.telefonoBio ?? null,
    empresa: null,
    cargo: t.especialidadDetectada ?? null,
    fuente: 'tiktok' as const,
    notas: [
      `TikTok: @${t.username}`,
      t.bio ? `Bio: ${t.bio}` : null,
      `Seguidores: ${t.seguidores.toLocaleString()}`,
      t.bioLink ? `Link: ${t.bioLink}` : null,
      t.videoDestacado ? `Video destacado (${t.videoDestacado.plays.toLocaleString()} plays): ${t.videoDestacado.texto.substring(0, 100)}` : null,
    ].filter(Boolean).join('\n'),
    etiquetas: ['tiktok', t.especialidadDetectada, t.verificado ? 'verificado' : null].filter(Boolean) as string[],
    organizacionId,
  };
}
