// ─── Rutas de Importación y Scraping ─────────────────────────────────────────
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { importarContactos } from '../services/contacto.service';
import { extraerContactosDeTexto, deduplicarContactos } from '../services/scraping/extractor.service';
import { scrapearCanalTelegram, buscarGruposAstrologia } from '../services/scraping/telegram.service';
import { scrapearPerfilInstagram, scrapearLoteInstagram } from '../services/scraping/instagram.service';
import { buscarAstrologos } from '../services/scraping/directorios.service';
import { buscarTikTok, tiktokAContactoCRM } from '../services/scraping/tiktok.service';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Todas las rutas de scraping/importación requieren autenticación
router.use(requireAuth);

// Multer: guardar archivos en memoria (no en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos CSV'));
    }
  },
});

// ─── Importación desde CSV ────────────────────────────────────────────────────

/**
 * POST /api/scraping/importar-csv
 * Importa contactos desde archivo CSV.
 */
router.post('/importar-csv', upload.single('archivo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ ok: false, error: 'No se recibió ningún archivo. Envíalo como form-data con el campo "archivo".' });
      return;
    }

    const contenido = req.file.buffer.toString('utf-8');
    const registros = parse(contenido, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[];

    if (registros.length === 0) {
      res.status(400).json({ ok: false, error: 'El CSV no contiene registros' });
      return;
    }

    const resultado = await importarContactos(registros, req.usuario!.organizacionId);
    res.json({
      ok: true,
      mensaje: `Importación completada: ${resultado.importados} importados, ${resultado.duplicados} duplicados, ${resultado.errores} errores`,
      data: resultado,
    });
  } catch (err) { next(err); }
});

// ─── Importación desde JSON ───────────────────────────────────────────────────

/**
 * POST /api/scraping/importar-json
 * Importa contactos desde JSON (útil para PhantomBuster, Apify, etc.)
 * Body: { contactos: [ { email, nombre, ... } ] }
 */
router.post('/importar-json', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contactos } = req.body as { contactos: Record<string, string>[] };

    if (!Array.isArray(contactos) || contactos.length === 0) {
      res.status(400).json({ ok: false, error: 'Body debe tener { contactos: [...] } con al menos un registro' });
      return;
    }

    const resultado = await importarContactos(contactos, req.usuario!.organizacionId);
    res.json({
      ok: true,
      mensaje: `Importación JSON: ${resultado.importados} importados, ${resultado.duplicados} duplicados, ${resultado.errores} errores`,
      data: resultado,
    });
  } catch (err) { next(err); }
});

// ─── Plantilla CSV ────────────────────────────────────────────────────────────

/**
 * GET /api/scraping/plantilla-csv
 * Devuelve plantilla vacía para descarga.
 */
router.get('/plantilla-csv', (_req: Request, res: Response) => {
  const cabecera = 'email,nombre,telefono,especialidad,nivel,pais,ciudad,fuente,instagramUrl,etiquetas,notas\n';
  const ejemplo = 'maria@ejemplo.com,María García,+52 55 1234 5678,astrologia_tropical,avanzado,MX,Ciudad de México,instagram,https://instagram.com/maria_astro,early_adopter|caliente,Conocida en grupo de Facebook\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_importacion_crm.csv"');
  res.send(cabecera + ejemplo);
});

// ─── NUEVO: Extractor de texto ────────────────────────────────────────────────

/**
 * POST /api/scraping/extraer-texto
 *
 * Parsea texto pegado (export de Telegram, lista de Facebook, etc.)
 * y extrae contactos estructurados automáticamente.
 *
 * Body:
 * {
 *   texto: string,           // texto en crudo a procesar
 *   fuente?: string,         // "telegram" | "facebook" | "instagram" | "manual"
 *   guardarAutomatico?: boolean  // si true, guarda los contactos en el CRM
 * }
 */
router.post('/extraer-texto', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { texto, fuente = 'manual', guardarAutomatico = false } = req.body as {
      texto: string;
      fuente?: string;
      guardarAutomatico?: boolean;
    };

    if (!texto || typeof texto !== 'string' || texto.trim().length < 5) {
      res.status(400).json({ ok: false, error: 'El campo "texto" es obligatorio y debe tener contenido' });
      return;
    }

    const extraidos = extraerContactosDeTexto(texto, fuente);
    const deduplicados = deduplicarContactos(extraidos);

    let importacion = null;
    if (guardarAutomatico && deduplicados.length > 0) {
      // Mapear al formato del CRM
      const paraImportar: Record<string, string>[] = deduplicados
        .filter(c => c.email)
        .map(c => {
          const row: Record<string, string> = {
            email: c.email!,
            fuente,
            etiquetas: c.confianza === 'alta' ? 'caliente' : 'frio',
          };
          if (c.nombre) row.nombre = c.nombre;
          if (c.telefono) row.telefono = c.telefono;
          if (c.instagramUrl) row.instagramUrl = c.instagramUrl;
          if (c.telegramUsername) row.telegramUsername = c.telegramUsername;
          if (c.especialidad) row.especialidad = c.especialidad;
          if (c.pais) row.pais = c.pais;
          if (c.notas) row.notas = c.notas;
          return row;
        });
      importacion = await importarContactos(paraImportar, req.usuario!.organizacionId);
    }

    res.json({
      ok: true,
      data: {
        totalExtraidos: deduplicados.length,
        conEmail: deduplicados.filter(c => c.email).length,
        sinEmail: deduplicados.filter(c => !c.email).length,
        confianzaAlta: deduplicados.filter(c => c.confianza === 'alta').length,
        contactos: deduplicados,
        importacion: importacion || null,
      },
    });
  } catch (err) { next(err); }
});

// ─── NUEVO: Scraping de canal/grupo de Telegram ───────────────────────────────

/**
 * GET /api/scraping/telegram/:username
 *
 * Obtiene información de un canal o grupo público de Telegram.
 * Extrae suscriptores, descripción, últimos mensajes y @menciones.
 *
 * Ejemplo: GET /api/scraping/telegram/astrologiamx
 */
router.get('/telegram/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;
    const info = await scrapearCanalTelegram(username);
    res.json({ ok: true, data: info });
  } catch (err) { next(err); }
});

/**
 * GET /api/scraping/telegram-buscar?q=astrologia
 *
 * Busca grupos/canales de Telegram relacionados con astrología.
 */
router.get('/telegram-buscar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const termino = (req.query.q as string) || 'astrologia';
    const grupos = await buscarGruposAstrologia(termino);
    res.json({ ok: true, total: grupos.length, data: grupos });
  } catch (err) { next(err); }
});

// ─── NUEVO: Scraping de perfil de Instagram ──────────────────────────────────

/**
 * GET /api/scraping/instagram/:username
 *
 * Obtiene datos públicos de un perfil de Instagram.
 * Extrae bio, seguidores, email si está en bio, especialidad detectada.
 *
 * Ejemplo: GET /api/scraping/instagram/maria_astrologia
 */
router.get('/instagram/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;
    const perfil = await scrapearPerfilInstagram(username);
    res.json({ ok: true, data: perfil });
  } catch (err) { next(err); }
});

/**
 * POST /api/scraping/instagram/lote
 *
 * Procesa una lista de usernames de Instagram en batch.
 * Body: { usernames: ["maria_astro", "carlos_tarot", ...], delayMs?: 2000 }
 */
router.post('/instagram/lote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { usernames, delayMs = 2000 } = req.body as {
      usernames: string[];
      delayMs?: number;
    };

    if (!Array.isArray(usernames) || usernames.length === 0) {
      res.status(400).json({ ok: false, error: 'Body debe tener { usernames: [...] }' });
      return;
    }

    if (usernames.length > 50) {
      res.status(400).json({ ok: false, error: 'Máximo 50 perfiles por lote' });
      return;
    }

    const resultados = await scrapearLoteInstagram(usernames, delayMs);
    const exitosos = resultados.filter(r => r.ok).length;

    res.json({
      ok: true,
      mensaje: `${exitosos}/${usernames.length} perfiles obtenidos`,
      data: resultados,
    });
  } catch (err) { next(err); }
});

// ─── NUEVO: Búsqueda en directorios ──────────────────────────────────────────

/**
 * POST /api/scraping/buscar-directorios
 *
 * Busca astrólogos/terapeutas en la web (DuckDuckGo) y Hotmart.
 *
 * Body:
 * {
 *   termino?: string,         // ej: "astrólogo"
 *   especialidad?: string,    // ej: "tarot"
 *   pais?: string,            // ej: "México"
 *   fuente?: "web" | "hotmart" | "todas"
 * }
 */
router.post('/buscar-directorios', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { termino, especialidad, pais, fuente = 'todas' } = req.body as {
      termino?: string;
      especialidad?: string;
      pais?: string;
      fuente?: 'web' | 'hotmart' | 'todas';
    };

    const resultado = await buscarAstrologos({ termino, especialidad, pais, fuente });

    res.json({ ok: true, ...resultado });
  } catch (err) { next(err); }
});

// ─── TikTok via Apify ────────────────────────────────────────────────────────

/**
 * POST /api/scraping/tiktok/buscar
 *
 * Busca perfiles en TikTok por keyword o hashtag usando Apify.
 * Requiere APIFY_TOKEN en .env.
 *
 * Body:
 * {
 *   query: string,          // ej: "terapeuta holístico" o "#astrologia"
 *   maxVideos?: number,     // default 50, max 200
 *   guardarAutomatico?: boolean  // si true, guarda contactos con email en el CRM
 * }
 */
router.post('/tiktok/buscar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, maxVideos = 50, guardarAutomatico = false } = req.body as {
      query: string;
      maxVideos?: number;
      guardarAutomatico?: boolean;
    };

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      res.status(400).json({ ok: false, error: 'El campo "query" es obligatorio (ej: "terapeuta holístico")' });
      return;
    }

    if (!process.env.APIFY_TOKEN) {
      res.status(503).json({ ok: false, error: 'APIFY_TOKEN no configurado. Agrega tu token de Apify al .env' });
      return;
    }

    const limite = Math.min(maxVideos, 200);
    const perfiles = await buscarTikTok(query.trim(), limite);

    let importacion = null;
    if (guardarAutomatico) {
      const orgId = req.usuario!.organizacionId;
      const conEmail = perfiles.filter(p => p.emailEnBio);
      if (conEmail.length > 0) {
        const paraImportar = conEmail.map(p => {
          const crm = tiktokAContactoCRM(p, orgId);
          return {
            email: crm.email ?? '',
            nombre: crm.nombre,
            telefono: crm.telefono ?? '',
            cargo: crm.cargo ?? '',
            fuente: crm.fuente,
            notas: crm.notas,
            etiquetas: crm.etiquetas.join('|'),
          } as Record<string, string>;
        }).filter(r => r.email);
        importacion = await importarContactos(paraImportar, orgId);
      }
    }

    res.json({
      ok: true,
      query,
      totalPerfiles: perfiles.length,
      conEmail: perfiles.filter(p => p.emailEnBio).length,
      sinEmail: perfiles.filter(p => !p.emailEnBio).length,
      importacion: importacion ?? null,
      data: perfiles,
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/scraping/tiktok/estado
 * Verifica si Apify está configurado.
 */
router.get('/tiktok/estado', (_req: Request, res: Response) => {
  const configurado = !!process.env.APIFY_TOKEN;
  res.json({
    ok: true,
    apifyConfigurado: configurado,
    mensaje: configurado
      ? 'Apify conectado. Listo para buscar en TikTok.'
      : 'APIFY_TOKEN no configurado. Agrégalo al .env para usar TikTok.',
  });
});

// ─── Fuentes disponibles ──────────────────────────────────────────────────────

/**
 * GET /api/scraping/fuentes
 *
 * Lista las fuentes de scraping disponibles y sus capacidades.
 */
router.get('/fuentes', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: {
      fuentes: [
        {
          id: 'extractor_texto',
          nombre: 'Extractor de texto',
          descripcion: 'Pega cualquier texto (export de Telegram, lista de Facebook, bio de Instagram) y extrae contactos automáticamente',
          endpoint: 'POST /api/scraping/extraer-texto',
          requiereApiKey: false,
          confiabilidad: 'alta',
          ejemplo: { texto: 'María García\nmaria@gmail.com\n@maria_astro\nAstrologa en CDMX', fuente: 'telegram' },
        },
        {
          id: 'telegram_canal',
          nombre: 'Telegram — Canal / Grupo público',
          descripcion: 'Extrae descripción, suscriptores, mensajes recientes y @menciones de canales públicos',
          endpoint: 'GET /api/scraping/telegram/:username',
          requiereApiKey: false,
          confiabilidad: 'alta',
          limitacion: 'Solo canales/grupos públicos. Grupos privados no son accesibles.',
          ejemplo: '/api/scraping/telegram/astrologiamx',
        },
        {
          id: 'telegram_buscar',
          nombre: 'Telegram — Buscar grupos',
          descripcion: 'Busca grupos y canales de Telegram sobre un tema',
          endpoint: 'GET /api/scraping/telegram-buscar?q=astrologia',
          requiereApiKey: false,
          confiabilidad: 'media',
        },
        {
          id: 'instagram_perfil',
          nombre: 'Instagram — Perfil público',
          descripcion: 'Extrae nombre, bio, seguidores y email visible de perfiles públicos',
          endpoint: 'GET /api/scraping/instagram/:username',
          requiereApiKey: false,
          confiabilidad: 'media',
          limitacion: 'Instagram puede bloquear solicitudes frecuentes. Usar con delay entre requests.',
        },
        {
          id: 'instagram_lote',
          nombre: 'Instagram — Lote de perfiles',
          descripcion: 'Procesa hasta 50 perfiles en batch con delay configurable',
          endpoint: 'POST /api/scraping/instagram/lote',
          requiereApiKey: false,
          confiabilidad: 'media',
        },
        {
          id: 'directorios_web',
          nombre: 'Búsqueda web (DuckDuckGo)',
          descripcion: 'Busca profesionales en la web pública por especialidad y país',
          endpoint: 'POST /api/scraping/buscar-directorios',
          requiereApiKey: false,
          confiabilidad: 'media',
        },
        {
          id: 'hotmart',
          nombre: 'Hotmart — Instructores',
          descripcion: 'Busca instructores de astrología y holística en Hotmart',
          endpoint: 'POST /api/scraping/buscar-directorios',
          body: { fuente: 'hotmart' },
          requiereApiKey: false,
          confiabilidad: 'media',
        },
        {
          id: 'importar_csv',
          nombre: 'Importar CSV',
          descripcion: 'Importa contactos desde archivo CSV (PhantomBuster, Apify, exportaciones manuales)',
          endpoint: 'POST /api/scraping/importar-csv',
          requiereApiKey: false,
          confiabilidad: 'alta',
        },
      ],
    },
  });
});

export default router;
