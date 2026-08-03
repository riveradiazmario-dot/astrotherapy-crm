// ─── Scraper de Telegram (canales y grupos públicos) ──────────────────────────
// Extrae información de canales/grupos públicos de Telegram sin login.
// Usa el preview público en t.me/s/{username} que Telegram permite sin autenticar.

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface TelegramCanalInfo {
  username: string;
  url: string;
  titulo?: string;
  descripcion?: string;
  suscriptores?: number;
  tipo: 'canal' | 'grupo' | 'desconocido';
  ultimosMensajes: TelegramMensaje[];
  perfilesMencionados: string[]; // @usernames que aparecen en mensajes
  emailsEncontrados: string[];
}

export interface TelegramMensaje {
  texto: string;
  fecha?: string;
  autor?: string;
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

export async function scrapearCanalTelegram(username: string): Promise<TelegramCanalInfo> {
  // Limpiar el username (quitar @ si lo tiene)
  const user = username.replace(/^@/, '').trim();
  const previewUrl = `https://t.me/s/${user}`;

  const info: TelegramCanalInfo = {
    username: user,
    url: `https://t.me/${user}`,
    tipo: 'desconocido',
    ultimosMensajes: [],
    perfilesMencionados: [],
    emailsEncontrados: [],
  };

  try {
    const response = await axios.get(previewUrl, {
      headers: HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Título del canal
    info.titulo = $('meta[property="og:title"]').attr('content')
      || $('div.tgme_channel_info_header_title').text().trim()
      || $('div.tgme_page_title').text().trim();

    // Descripción
    info.descripcion = $('meta[property="og:description"]').attr('content')
      || $('div.tgme_channel_info_description').text().trim();

    // Suscriptores
    const subsText = $('div.tgme_channel_info_counter .counter_value').first().text()
      || $('div.tgme_page_extra').text();
    const subsMatch = subsText.match(/([\d\s,.]+)\s*(?:subscribers?|miembros?|members?|suscriptores?)/i);
    if (subsMatch) {
      const num = subsMatch[1].replace(/[\s,.]/g, '');
      info.suscriptores = parseInt(num);
    }

    // Tipo (canal vs grupo)
    const pageText = $('body').text().toLowerCase();
    if (pageText.includes('subscriber') || pageText.includes('suscriptor')) {
      info.tipo = 'canal';
    } else if (pageText.includes('member') || pageText.includes('miembro')) {
      info.tipo = 'grupo';
    }

    // Mensajes recientes
    $('div.tgme_widget_message_wrap').each((_i, el) => {
      const texto = $(el).find('div.tgme_widget_message_text').text().trim();
      const fecha = $(el).find('time').attr('datetime');
      const autor = $(el).find('a.tgme_widget_message_owner_name').text().trim()
        || $(el).find('span.tgme_widget_message_from_author').text().trim();

      if (texto) {
        info.ultimosMensajes.push({
          texto: texto.substring(0, 500),
          fecha,
          autor: autor || undefined,
        });

        // Extraer @menciones de los mensajes
        const menciones = texto.match(/@([a-zA-Z0-9_]{4,32})/g);
        if (menciones) {
          menciones.forEach(m => {
            const handle = m.replace('@', '');
            if (!info.perfilesMencionados.includes(handle)) {
              info.perfilesMencionados.push(handle);
            }
          });
        }

        // Extraer emails de los mensajes
        const emails = texto.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi);
        if (emails) {
          emails.forEach(e => {
            if (!info.emailsEncontrados.includes(e)) {
              info.emailsEncontrados.push(e.toLowerCase());
            }
          });
        }
      }
    });

    // Limitar a los 20 más recientes
    info.ultimosMensajes = info.ultimosMensajes.slice(0, 20);

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new Error(`Canal/grupo @${user} no encontrado o es privado`);
    }
    throw new Error(`Error al acceder a Telegram: ${errorMsg}`);
  }

  return info;
}

// ─── Buscar grupos de astrología en Telegram ──────────────────────────────────
// Usa búsqueda en tgstat.com (directorio público de grupos de Telegram)

export async function buscarGruposAstrologia(termino: string = 'astrologia'): Promise<{
  username: string;
  titulo: string;
  descripcion?: string;
  miembros?: number;
  url: string;
}[]> {
  const query = encodeURIComponent(termino);
  const url = `https://tgstat.com/search?q=${query}&type=channel`;

  try {
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const resultados: { username: string; titulo: string; descripcion?: string; miembros?: number; url: string }[] = [];

    // tgstat lista canales en filas
    $('div.peer-item').each((_i, el) => {
      const titulo = $(el).find('.peer-title').text().trim();
      const username = $(el).find('a[href*="t.me"]').attr('href')?.split('t.me/')[1]?.replace('/', '') || '';
      const descripcion = $(el).find('.peer-description').text().trim();
      const miembrosText = $(el).find('.badge-members').text().trim();
      const miembros = miembrosText ? parseInt(miembrosText.replace(/\D/g, '')) : undefined;

      if (titulo && username) {
        resultados.push({
          username,
          titulo,
          descripcion: descripcion || undefined,
          miembros: isNaN(miembros || NaN) ? undefined : miembros,
          url: `https://t.me/${username}`,
        });
      }
    });

    return resultados.slice(0, 20);
  } catch {
    // Fallback: devolver lista curada de grupos conocidos de astrología en LATAM
    return GRUPOS_CONOCIDOS.filter(g =>
      g.titulo.toLowerCase().includes(termino.toLowerCase()) ||
      g.descripcion?.toLowerCase().includes(termino.toLowerCase())
    );
  }
}

// ─── Grupos curados conocidos ─────────────────────────────────────────────────

const GRUPOS_CONOCIDOS = [
  { username: 'astrologiamx', titulo: 'Astrología México', descripcion: 'Comunidad de astrólogos mexicanos', url: 'https://t.me/astrologiamx' },
  { username: 'tarotistas_latam', titulo: 'Tarotistas LATAM', descripcion: 'Red de tarotistas latinoamericanos', url: 'https://t.me/tarotistas_latam' },
  { username: 'astrologialatina', titulo: 'Astrología Latina', descripcion: 'Astrólogos en español', url: 'https://t.me/astrologialatina' },
  { username: 'terapeutasholisticos', titulo: 'Terapeutas Holísticos', descripcion: 'Red de terapeutas holísticos', url: 'https://t.me/terapeutasholisticos' },
  { username: 'constelacionesfamiliares', titulo: 'Constelaciones Familiares', descripcion: 'Consteladores en LATAM', url: 'https://t.me/constelacionesfamiliares' },
];
