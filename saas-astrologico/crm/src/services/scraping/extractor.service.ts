// ─── Extractor de texto — parsea texto pegado y extrae contactos ──────────────
// Acepta texto en crudo (export de Telegram, lista de Facebook, texto libre)
// y extrae emails, teléfonos, usernames e info profesional automáticamente.

export interface ContactoExtraido {
  nombre?: string;
  email?: string;
  telefono?: string;
  instagramUrl?: string;
  instagramUsername?: string;
  telegramUsername?: string;
  tiktokUrl?: string;
  webUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  especialidad?: string;
  pais?: string;
  notas?: string;
  fuente: string;
  confianza: 'alta' | 'media' | 'baja'; // qué tan completo está el contacto
}

// ─── Patrones de detección ────────────────────────────────────────────────────

const PATRONES = {
  email: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi,
  telefono: /(?:\+?[\d]{1,3}[\s\-.]?)?[\(]?[\d]{2,4}[\)]?[\s\-.]?[\d]{2,4}[\s\-.]?[\d]{2,6}/g,
  instagram: /(?:instagram\.com\/|ig:|instagram:|@)([a-zA-Z0-9._]{2,30})/gi,
  telegram: /(?:t\.me\/|telegram\.me\/|@)([a-zA-Z0-9_]{4,32})/gi,
  tiktok: /(?:tiktok\.com\/@?)([a-zA-Z0-9._]{2,30})/gi,
  youtube: /(?:youtube\.com\/(?:c\/|channel\/|user\/|@))([a-zA-Z0-9._\-]{2,50})/gi,
  facebook: /facebook\.com\/(?:profile\.php\?id=\d+|[a-zA-Z0-9.]+)/gi,
  web: /https?:\/\/(?!(?:instagram|facebook|tiktok|youtube|t\.me|twitter|linkedin))[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)*/gi,
};

const KEYWORDS_ESPECIALIDAD: Record<string, string[]> = {
  astrologia_tropical: ['astrólog', 'astrolog', 'carta natal', 'natal chart', 'horóscopo', 'horoscope', 'astro'],
  astrologia_vedica: ['jyotish', 'védic', 'vedic', 'astrología védica'],
  tarot: ['tarot', 'tarotista', 'tarotist', 'oracl', 'cartomanci'],
  constelaciones_familiares: ['constelacion', 'bert hellinger', 'consteladora', 'constelador'],
  reiki: ['reiki', 'sanación energétic', 'chakr'],
  coaching_holistico: ['coach holístic', 'coaching holístic', 'coach espiritual'],
  numerologia: ['numerolog'],
  astrogenealogia: ['astrogenealog', 'transgeneracional'],
};

const PAISES_KEYWORDS: Record<string, string[]> = {
  MX: ['mexico', 'méxico', 'cdmx', 'monterrey', 'guadalajara', 'puebla', '.mx'],
  CO: ['colombia', 'bogotá', 'bogota', 'medellín', 'medellin', 'cali', '.co'],
  AR: ['argentina', 'buenos aires', 'rosario', 'córdoba', 'cordoba', '.ar'],
  ES: ['españa', 'spain', 'madrid', 'barcelona', 'españa', '.es'],
  PE: ['perú', 'peru', 'lima', '.pe'],
  CL: ['chile', 'santiago', '.cl'],
  VE: ['venezuela', 'caracas', '.ve'],
  EC: ['ecuador', 'quito', 'guayaquil', '.ec'],
};

// ─── Limpieza de teléfonos ─────────────────────────────────────────────────────

function limpiarTelefono(raw: string): string | null {
  const limpio = raw.replace(/[\s\-.()\[\]]/g, '');
  // Mínimo 8 dígitos, máximo 15
  const soloDigitos = limpio.replace(/\D/g, '');
  if (soloDigitos.length < 8 || soloDigitos.length > 15) return null;
  return raw.trim();
}

// ─── Detección de nombre ───────────────────────────────────────────────────────

function extraerNombre(texto: string): string | undefined {
  // Busca patrones como "Nombre: X", "Name: X" al inicio de línea
  const patronNombre = /(?:^|\n)(?:nombre|name|contacto|contact):\s*([^\n]+)/i;
  const matchNombre = texto.match(patronNombre);
  if (matchNombre) return matchNombre[1].trim();

  // Busca primera línea que parezca un nombre propio (2-4 palabras capitalizadas)
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  for (const linea of lineas.slice(0, 5)) {
    // Excluir URLs y emails
    if (linea.includes('@') || linea.includes('http') || linea.includes('.com')) continue;
    // Buscar 2-4 palabras con primera letra mayúscula
    const palabras = linea.split(/\s+/);
    if (palabras.length >= 2 && palabras.length <= 5) {
      const pareceNombre = palabras.every(p => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(p));
      if (pareceNombre) return linea;
    }
  }
  return undefined;
}

// ─── Detección de especialidad ────────────────────────────────────────────────

function detectarEspecialidad(texto: string): string | undefined {
  const textoMin = texto.toLowerCase();
  for (const [esp, keywords] of Object.entries(KEYWORDS_ESPECIALIDAD)) {
    if (keywords.some(kw => textoMin.includes(kw))) return esp;
  }
  return undefined;
}

// ─── Detección de país ────────────────────────────────────────────────────────

function detectarPais(texto: string): string | undefined {
  const textoMin = texto.toLowerCase();
  for (const [codigo, keywords] of Object.entries(PAISES_KEYWORDS)) {
    if (keywords.some(kw => textoMin.includes(kw))) return codigo;
  }
  return undefined;
}

// ─── Calcular confianza ────────────────────────────────────────────────────────

function calcularConfianza(c: Partial<ContactoExtraido>): 'alta' | 'media' | 'baja' {
  let puntos = 0;
  if (c.email) puntos += 3;
  if (c.telefono) puntos += 2;
  if (c.nombre) puntos += 2;
  if (c.instagramUsername || c.telegramUsername) puntos += 1;
  if (c.especialidad) puntos += 1;
  if (puntos >= 5) return 'alta';
  if (puntos >= 2) return 'media';
  return 'baja';
}

// ─── Función principal ────────────────────────────────────────────────────────

export function extraerContactosDeTexto(
  texto: string,
  fuente: string = 'manual',
): ContactoExtraido[] {
  // Dividir en bloques si hay múltiples contactos (separados por líneas vacías o ----)
  const bloques = texto.split(/\n{2,}|[-]{3,}|\n={3,}/g).filter(b => b.trim().length > 10);

  // Si solo hay un bloque, procesarlo completo
  const entradas = bloques.length > 1 ? bloques : [texto];

  const contactos: ContactoExtraido[] = [];

  for (const bloque of entradas) {
    const c: Partial<ContactoExtraido> = { fuente };

    // Email
    const emails = bloque.match(PATRONES.email);
    if (emails?.length) {
      // Filtrar emails falsos comunes
      const emailFiltrado = emails.find(e =>
        !e.includes('noreply') &&
        !e.includes('example') &&
        !e.includes('test@') &&
        !e.endsWith('.png') &&
        !e.endsWith('.jpg')
      );
      if (emailFiltrado) c.email = emailFiltrado.toLowerCase();
    }

    // Teléfono
    const telefonos = bloque.match(PATRONES.telefono);
    if (telefonos?.length) {
      const telLimpio = limpiarTelefono(telefonos[0]);
      if (telLimpio) c.telefono = telLimpio;
    }

    // Instagram
    const instagramMatches = [...bloque.matchAll(new RegExp(PATRONES.instagram.source, 'gi'))];
    if (instagramMatches.length) {
      const username = instagramMatches[0][1];
      if (username && !['p', 'tv', 'reel', 'explore'].includes(username)) {
        c.instagramUsername = username;
        c.instagramUrl = `https://instagram.com/${username}`;
      }
    }

    // Telegram
    const telegramMatches = [...bloque.matchAll(new RegExp(PATRONES.telegram.source, 'gi'))];
    if (telegramMatches.length) {
      const username = telegramMatches[0][1];
      if (username) c.telegramUsername = username;
    }

    // TikTok
    const tiktokMatches = [...bloque.matchAll(new RegExp(PATRONES.tiktok.source, 'gi'))];
    if (tiktokMatches.length) {
      c.tiktokUrl = `https://tiktok.com/@${tiktokMatches[0][1]}`;
    }

    // YouTube
    const youtubeMatches = [...bloque.matchAll(new RegExp(PATRONES.youtube.source, 'gi'))];
    if (youtubeMatches.length) {
      c.youtubeUrl = `https://youtube.com/${youtubeMatches[0][0].split('youtube.com/')[1]}`;
    }

    // Facebook
    const facebookMatches = bloque.match(PATRONES.facebook);
    if (facebookMatches?.length) {
      c.facebookUrl = facebookMatches[0].startsWith('http') ? facebookMatches[0] : `https://${facebookMatches[0]}`;
    }

    // Web personal
    const webMatches = bloque.match(PATRONES.web);
    if (webMatches?.length) {
      c.webUrl = webMatches[0];
    }

    // Nombre
    c.nombre = extraerNombre(bloque);

    // Especialidad
    c.especialidad = detectarEspecialidad(bloque);

    // País
    c.pais = detectarPais(bloque);

    // Notas (primeras 2 líneas significativas del bloque como contexto)
    const primerasLineas = bloque.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 5 && !l.match(PATRONES.email) && !l.match(/https?:\/\//))
      .slice(0, 2)
      .join(' | ');
    if (primerasLineas) c.notas = primerasLineas.substring(0, 300);

    // Solo incluir si tiene al menos un dato de contacto útil
    const tieneContacto = c.email || c.telefono || c.instagramUsername || c.telegramUsername;
    if (tieneContacto) {
      c.confianza = calcularConfianza(c);
      contactos.push(c as ContactoExtraido);
    }
  }

  return contactos;
}

// ─── Deduplicar resultados ────────────────────────────────────────────────────

export function deduplicarContactos(contactos: ContactoExtraido[]): ContactoExtraido[] {
  const vistos = new Set<string>();
  return contactos.filter(c => {
    const clave = c.email || c.telegramUsername || c.instagramUsername || c.telefono;
    if (!clave || vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}
