// ─── Scraper de directorios web especializados ────────────────────────────────
// Busca astrólogos y terapeutas en directorios públicos de LATAM:
// Hotmart (instructores), búsqueda web (DuckDuckGo HTML), y sitios especializados.

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ResultadoDirectorio {
  fuente: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  webUrl?: string;
  instagramUrl?: string;
  descripcion?: string;
  pais?: string;
  ciudad?: string;
  especialidad?: string;
  urlPerfil?: string;
}

const HEADERS_WEB = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
};

// ─── DuckDuckGo HTML search (sin API key) ─────────────────────────────────────

export async function buscarEnWeb(query: string, pais?: string): Promise<ResultadoDirectorio[]> {
  const terminoBusqueda = pais
    ? `${query} ${pais} email contacto`
    : `${query} email contacto LATAM`;

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(terminoBusqueda)}`;

  try {
    const response = await axios.get(url, {
      headers: HEADERS_WEB,
      timeout: 12000,
    });

    const $ = cheerio.load(response.data);
    const resultados: ResultadoDirectorio[] = [];

    // Parsear resultados de DuckDuckGo HTML
    $('div.result').each((_i, el) => {
      const titulo = $(el).find('a.result__a').text().trim();
      const snippet = $(el).find('a.result__snippet').text().trim();
      const urlResultado = $(el).find('a.result__url').text().trim();

      if (!titulo || !snippet) return;

      // Excluir resultados irrelevantes
      const excluir = ['youtube.com', 'facebook.com', 'twitter.com', 'wikipedia'];
      if (excluir.some(ex => urlResultado.includes(ex))) return;

      const resultado: ResultadoDirectorio = {
        fuente: 'busqueda_web',
        nombre: titulo,
        descripcion: snippet.substring(0, 300),
        webUrl: urlResultado.startsWith('http') ? urlResultado : `https://${urlResultado}`,
      };

      // Extraer email del snippet si aparece
      const emailMatch = snippet.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) resultado.email = emailMatch[0].toLowerCase();

      // Detectar país por URL
      if (urlResultado.includes('.mx')) resultado.pais = 'MX';
      else if (urlResultado.includes('.co')) resultado.pais = 'CO';
      else if (urlResultado.includes('.ar')) resultado.pais = 'AR';
      else if (urlResultado.includes('.es')) resultado.pais = 'ES';
      else if (urlResultado.includes('.pe')) resultado.pais = 'PE';
      else if (urlResultado.includes('.cl')) resultado.pais = 'CL';

      resultados.push(resultado);
    });

    return resultados.slice(0, 15);

  } catch (err) {
    throw new Error(`Error en búsqueda web: ${err instanceof Error ? err.message : 'desconocido'}`);
  }
}

// ─── Hotmart: buscar instructores de astrología ───────────────────────────────

export async function buscarEnHotmart(termino: string): Promise<ResultadoDirectorio[]> {
  const url = `https://hotmart.com/es/discover?q=${encodeURIComponent(termino)}&type=PERSON`;

  try {
    const response = await axios.get(url, {
      headers: HEADERS_WEB,
      timeout: 12000,
    });

    const $ = cheerio.load(response.data);
    const resultados: ResultadoDirectorio[] = [];

    // Hotmart usa React, los datos pueden estar en JSON embebido
    // Intentar extraer de __NEXT_DATA__ o similar
    $('script#__NEXT_DATA__').each((_i, el) => {
      try {
        const data = JSON.parse($(el).html() || '{}');
        const creators = data?.props?.pageProps?.creators || data?.props?.pageProps?.results || [];

        if (Array.isArray(creators)) {
          creators.forEach((c: Record<string, unknown>) => {
            resultados.push({
              fuente: 'hotmart',
              nombre: (c.name || c.displayName) as string | undefined,
              descripcion: (c.bio || c.description) as string | undefined,
              webUrl: c.profileUrl ? `https://hotmart.com${c.profileUrl}` : undefined,
              urlPerfil: c.profileUrl ? `https://hotmart.com${c.profileUrl}` : undefined,
            });
          });
        }
      } catch { /* ignorar */ }
    });

    // Fallback: parsear HTML directamente
    if (!resultados.length) {
      $('div[class*="creator"], div[class*="product-card"], div[class*="author"]').each((_i, el) => {
        const nombre = $(el).find('h2, h3, [class*="name"], [class*="title"]').first().text().trim();
        const descripcion = $(el).find('p, [class*="desc"], [class*="bio"]').first().text().trim();
        const href = $(el).find('a').first().attr('href');

        if (nombre && nombre.length > 2) {
          resultados.push({
            fuente: 'hotmart',
            nombre,
            descripcion: descripcion.substring(0, 300) || undefined,
            urlPerfil: href ? (href.startsWith('http') ? href : `https://hotmart.com${href}`) : undefined,
          });
        }
      });
    }

    return resultados.slice(0, 20);

  } catch (err) {
    throw new Error(`Error al buscar en Hotmart: ${err instanceof Error ? err.message : 'desconocido'}`);
  }
}

// ─── Estrategia combinada de búsqueda ────────────────────────────────────────

export type FuenteDirectorio = 'web' | 'hotmart' | 'todas';

export async function buscarAstrologos(opciones: {
  termino?: string;
  pais?: string;
  especialidad?: string;
  fuente?: FuenteDirectorio;
}): Promise<{
  total: number;
  resultados: ResultadoDirectorio[];
  fuentes: string[];
  errores: string[];
}> {
  const {
    termino = 'astrólogo',
    pais,
    especialidad,
    fuente = 'todas',
  } = opciones;

  const busqueda = especialidad || termino;
  const resultados: ResultadoDirectorio[] = [];
  const fuentes: string[] = [];
  const errores: string[] = [];

  // Búsqueda web (DuckDuckGo)
  if (fuente === 'web' || fuente === 'todas') {
    try {
      const resWeb = await buscarEnWeb(
        `${busqueda} site profesional`,
        pais,
      );
      resultados.push(...resWeb);
      fuentes.push('busqueda_web');
    } catch (err) {
      errores.push(`busqueda_web: ${err instanceof Error ? err.message : 'error'}`);
    }
  }

  // Hotmart
  if (fuente === 'hotmart' || fuente === 'todas') {
    try {
      const resHotmart = await buscarEnHotmart(busqueda);
      resultados.push(...resHotmart);
      fuentes.push('hotmart');
    } catch (err) {
      errores.push(`hotmart: ${err instanceof Error ? err.message : 'error'}`);
    }
  }

  // Deduplicar por nombre+URL
  const vistos = new Set<string>();
  const dedup = resultados.filter(r => {
    const clave = r.email || r.webUrl || r.nombre || '';
    if (!clave || vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });

  return {
    total: dedup.length,
    resultados: dedup,
    fuentes,
    errores,
  };
}
