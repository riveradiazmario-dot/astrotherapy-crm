// ─── Instagram Scraper via Apify ──────────────────────────────────────────────
// Actor: apify/instagram-scraper
// Reemplaza el scraper de cheerio que era bloqueado frecuentemente por Instagram.
// Apify usa proxies rotativos → mucho más confiable.

import { ejecutarActor } from './apify.service';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface InstagramPerfilInfo {
  username: string;
  url: string;
  nombre?: string;
  bio?: string;
  seguidores?: number;
  siguiendo?: number;
  publicaciones?: number;
  emailEnBio?: string;
  webEnBio?: string;
  telefonoBio?: string;
  esVerificado?: boolean;
  esBusiness?: boolean;
  imagenPerfil?: string;
  especialidadDetectada?: string;
}

// Forma que devuelve el actor apify/instagram-scraper para perfiles
interface ApifyInstagramPerfil {
  username?: string;
  fullName?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  isVerified?: boolean;
  isBusinessAccount?: boolean;
  profilePicUrl?: string;
  externalUrl?: string;
  businessEmail?: string;
  businessPhoneNumber?: string;
}

// ─── Detectores ──────────────────────────────────────────────────────────────

const KEYWORDS_ESP: Record<string, string[]> = {
  astrologia_tropical: ['astrólog', 'astrolog', 'carta natal', 'horóscopo'],
  astrologia_vedica:   ['jyotish', 'védic', 'vedic'],
  tarot:               ['tarot', 'tarotista', 'oracl'],
  constelaciones:      ['constelac'],
  reiki:               ['reiki', 'energétic'],
  coaching_holistico:  ['coach holístic', 'coach espiritual'],
  numerologia:         ['numerolog'],
};

function detectarEspecialidad(texto: string): string | undefined {
  const t = texto.toLowerCase();
  for (const [esp, kws] of Object.entries(KEYWORDS_ESP)) {
    if (kws.some(kw => t.includes(kw))) return esp;
  }
  return undefined;
}

function extraerEmail(texto: string): string | undefined {
  const m = texto.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : undefined;
}

function extraerWeb(texto: string): string | undefined {
  const m = texto.match(/https?:\/\/[^\s]+/);
  if (m) return m[0];
  const lt = texto.match(/linktr\.ee\/[\w.]+/);
  if (lt) return `https://${lt[0]}`;
  return undefined;
}

function mapearPerfil(raw: ApifyInstagramPerfil): InstagramPerfilInfo {
  const username = raw.username ?? '';
  const bio = raw.biography ?? '';

  return {
    username,
    url: `https://www.instagram.com/${username}/`,
    nombre: raw.fullName,
    bio,
    seguidores: raw.followersCount,
    siguiendo: raw.followsCount,
    publicaciones: raw.postsCount,
    esVerificado: raw.isVerified,
    esBusiness: raw.isBusinessAccount,
    imagenPerfil: raw.profilePicUrl,
    // Apify entrega email/teléfono de cuentas business directamente
    emailEnBio: raw.businessEmail ?? extraerEmail(bio),
    telefonoBio: raw.businessPhoneNumber ?? undefined,
    webEnBio: raw.externalUrl ?? extraerWeb(bio),
    especialidadDetectada: detectarEspecialidad(bio + ' ' + (raw.fullName ?? '')),
  };
}

// ─── Scraping de un perfil ────────────────────────────────────────────────────

export async function scrapearPerfilInstagram(username: string): Promise<InstagramPerfilInfo> {
  const user = username.replace(/^@/, '').replace(/\/$/, '').trim();

  if (!process.env.APIFY_TOKEN) {
    throw new Error('APIFY_TOKEN no configurado en .env');
  }

  const resultados = await ejecutarActor<ApifyInstagramPerfil>(
    'apify/instagram-scraper',
    {
      directUrls: [`https://www.instagram.com/${user}/`],
      resultsType: 'profiles',
      resultsLimit: 1,
      proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
    },
    90,
  );

  if (!resultados || resultados.length === 0) {
    throw new Error(`Perfil @${user} no encontrado o cuenta privada`);
  }

  return mapearPerfil(resultados[0]);
}

// ─── Lote de perfiles ─────────────────────────────────────────────────────────

export async function scrapearLoteInstagram(
  usernames: string[],
  _delayMs = 0, // ya no hace falta delay — Apify maneja los proxies
): Promise<{ ok: boolean; username: string; data?: InstagramPerfilInfo; error?: string }[]> {

  if (!process.env.APIFY_TOKEN) {
    return usernames.map(u => ({ ok: false, username: u, error: 'APIFY_TOKEN no configurado' }));
  }

  const urls = usernames.map(u =>
    `https://www.instagram.com/${u.replace(/^@/, '').trim()}/`
  );

  let rawResultados: ApifyInstagramPerfil[] = [];

  try {
    rawResultados = await ejecutarActor<ApifyInstagramPerfil>(
      'apify/instagram-scraper',
      {
        directUrls: urls,
        resultsType: 'profiles',
        resultsLimit: usernames.length,
        proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
      },
      180,
    );
  } catch (err) {
    return usernames.map(u => ({
      ok: false,
      username: u,
      error: err instanceof Error ? err.message : 'Error en Apify',
    }));
  }

  // Indexar por username para mapear resultados
  const porUsername = new Map(rawResultados.map(r => [r.username?.toLowerCase(), r]));

  return usernames.map(u => {
    const clean = u.replace(/^@/, '').trim().toLowerCase();
    const raw = porUsername.get(clean);
    if (raw) {
      return { ok: true, username: clean, data: mapearPerfil(raw) };
    }
    return { ok: false, username: clean, error: 'No encontrado (cuenta privada o no existe)' };
  });
}
