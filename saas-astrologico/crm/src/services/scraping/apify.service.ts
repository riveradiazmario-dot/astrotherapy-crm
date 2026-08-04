// ─── Servicio Apify — Cliente base + Webhook Pipeline ────────────────────────
import axios, { AxiosInstance } from 'axios';
import 'dotenv/config';
import { importarContactos } from '../contacto.service';
import { logger } from '../../logger';

const APIFY_BASE = 'https://api.apify.com/v2';
const TOKEN = process.env.APIFY_TOKEN;
const ORG_ID = 'org-luz-holistica';

if (!TOKEN) {
  console.warn('[Apify] APIFY_TOKEN no configurado en .env');
}

const apify: AxiosInstance = axios.create({
  baseURL: APIFY_BASE,
  headers: { Authorization: `Bearer ${TOKEN}` },
  timeout: 60_000,
});

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface OrganicResult {
  title?: string;
  url?: string;
  description?: string;
  websiteTitle?: string;
  emphasizedKeywords?: string[];
}

interface SerpItem {
  searchQuery?: { term?: string };
  organicResults?: OrganicResult[];
  '#error'?: boolean;
}

interface ContactItem {
  url?: string;
  emails?: string[];
  phones?: string[];
  domain?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  website?: string;
  country?: string;
  bio?: string;
}

export type ApifyActorType = 'serp' | 'contact_details' | 'email_extractor' | 'unknown';

// ─── Detectar tipo de actor por estructura del item ───────────────────────────

export function detectarTipoActor(items: unknown[]): ApifyActorType {
  if (!Array.isArray(items) || items.length === 0) return 'unknown';
  const first = items[0] as Record<string, unknown>;
  if ('organicResults' in first || 'searchQuery' in first) return 'serp';
  if ('emails' in first || 'phones' in first) return 'contact_details';
  if ('email' in first && ('firstName' in first || 'name' in first)) return 'email_extractor';
  return 'unknown';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extraerEmails(texto: string): string[] {
  const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  return [...new Set(texto.match(re) ?? [])];
}

// ─── Transformadores ──────────────────────────────────────────────────────────

function transformarSerp(items: SerpItem[]): Record<string, string>[] {
  const contactos: Record<string, string>[] = [];
  for (const item of items) {
    if (item['#error']) continue;
    for (const r of item.organicResults ?? []) {
      const texto = [r.description ?? '', ...(r.emphasizedKeywords ?? [])].join(' ');
      for (const email of extraerEmails(texto)) {
        contactos.push({
          nombre: (r.title ?? '').replace(/[-|–—].*$/, '').trim().substring(0, 80),
          email,
          fuente: r.url ?? '',
          especialidad: 'astrología',
          notas: `Google: "${item.searchQuery?.term ?? ''}" | ${r.websiteTitle ?? ''}`,
        });
      }
    }
  }
  return contactos;
}

function transformarContactDetails(items: ContactItem[]): Record<string, string>[] {
  const contactos: Record<string, string>[] = [];
  for (const item of items) {
    const emails = item.emails ?? [];
    if (emails.length === 0) continue;
    const nombre = item.domain?.replace(/^www\./, '').split('.')[0] ?? 'Prospecto';
    for (const email of emails) {
      contactos.push({
        nombre,
        email,
        fuente: item.url ?? item.domain ?? '',
        especialidad: 'astrología',
        notas: `Contact Details Scraper | ${item.url ?? ''}`,
      });
    }
  }
  return contactos;
}

function transformarEmailExtractor(items: ContactItem[]): Record<string, string>[] {
  return items
    .filter(i => i.email)
    .map(i => ({
      nombre: `${i.firstName ?? ''} ${i.lastName ?? ''}`.trim() || i.name || 'Prospecto',
      email: i.email ?? '',
      fuente: i.website ?? '',
      especialidad: i.title ?? 'astrología',
      pais: i.country ?? '',
      notas: i.bio ?? '',
    }));
}

// ─── Fetch paginado de dataset ────────────────────────────────────────────────

export async function fetchDatasetItems(datasetId: string): Promise<unknown[]> {
  let todos: unknown[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const res = await apify.get(`/datasets/${datasetId}/items`, {
      params: { limit, offset, clean: true, format: 'json' },
    });
    const batch = res.data as unknown[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    todos = todos.concat(batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return todos;
}

// ─── Importar contactos desde dataset Apify al CRM ───────────────────────────

export async function importarDesdeDataset(
  datasetId: string,
  tipoForzado?: ApifyActorType,
) {
  logger.info(`[Apify] Fetcheando dataset ${datasetId}...`);
  const items = await fetchDatasetItems(datasetId);
  logger.info(`[Apify] ${items.length} items obtenidos`);

  const tipo = tipoForzado ?? detectarTipoActor(items);
  logger.info(`[Apify] Tipo detectado: ${tipo}`);

  let registros: Record<string, string>[] = [];
  switch (tipo) {
    case 'serp':            registros = transformarSerp(items as SerpItem[]); break;
    case 'contact_details': registros = transformarContactDetails(items as ContactItem[]); break;
    case 'email_extractor': registros = transformarEmailExtractor(items as ContactItem[]); break;
    default:
      logger.warn(`[Apify] Tipo desconocido, intentando como contact_details`);
      registros = transformarContactDetails(items as ContactItem[]);
  }

  logger.info(`[Apify] ${registros.length} contactos para importar`);

  if (registros.length === 0) {
    return { tipo, encontrados: 0, resultado: { importados: 0, duplicados: 0, errores: 0, detalles: ['Sin emails en dataset'] } };
  }

  const resultado = await importarContactos(registros, ORG_ID);
  logger.info(`[Apify] Importación: ${JSON.stringify(resultado)}`);
  return { tipo, encontrados: registros.length, resultado };
}

// ─── Configs de actores ───────────────────────────────────────────────────────

export const APIFY_ACTORS = {
  CONTACT_DETAILS: 'apify/contact-details-scraper',
  GOOGLE_SERP: 'apify/google-search-scraper',
} as const;

// ─── Ejecutar un actor y esperar el resultado (sync, para uso interno) ────────

export async function ejecutarActor<T = Record<string, unknown>>(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 120,
): Promise<T[]> {
  if (!TOKEN) throw new Error('APIFY_TOKEN no configurado en .env');

  const runRes = await apify.post(
    `/acts/${actorId}/runs`,
    input,
    { params: { timeout: timeoutSecs, memory: 512 } },
  );
  const runId: string = runRes.data.data.id;
  const defaultDatasetId: string = runRes.data.data.defaultDatasetId;

  const deadline = Date.now() + timeoutSecs * 1500;
  while (Date.now() < deadline) {
    await sleep(4000);
    const statusRes = await apify.get(`/actor-runs/${runId}`);
    const status: string = statusRes.data.data.status;
    if (status === 'SUCCEEDED') break;
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Actor ${actorId} terminó con estado: ${status}`);
    }
  }

  const dataRes = await apify.get(`/datasets/${defaultDatasetId}/items`, {
    params: { clean: true, format: 'json' },
  });
  return dataRes.data as T[];
}

// ─── Lanzar job async (para webhook workflow) ─────────────────────────────────

export async function lanzarApifyRun(
  actorId: string,
  input: Record<string, unknown>,
): Promise<{ runId: string; datasetId: string }> {
  if (!TOKEN) throw new Error('APIFY_TOKEN no configurado');
  const res = await apify.post(`/acts/${actorId}/runs`, input, {
    params: { memory: 512 },
  });
  return { runId: res.data.data.id, datasetId: res.data.data.defaultDatasetId };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
