// ─── Servicio Apify — Cliente base para actores ──────────────────────────────
import axios, { AxiosInstance } from 'axios';
import 'dotenv/config';

const APIFY_BASE = 'https://api.apify.com/v2';
const TOKEN = process.env.APIFY_TOKEN;

if (!TOKEN) {
  console.warn('[Apify] APIFY_TOKEN no configurado en .env');
}

const apify: AxiosInstance = axios.create({
  baseURL: APIFY_BASE,
  headers: { Authorization: `Bearer ${TOKEN}` },
  timeout: 60_000,
});

// ─── Ejecutar un actor y esperar el resultado ─────────────────────────────────
// Apify usa un modelo asíncrono: POST → obtiene runId → polling hasta "SUCCEEDED"
export async function ejecutarActor<T = Record<string, unknown>>(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 120,
): Promise<T[]> {
  if (!TOKEN) throw new Error('APIFY_TOKEN no configurado en .env');

  // 1. Lanzar la corrida
  const runRes = await apify.post(
    `/acts/${actorId}/runs`,
    input,
    { params: { timeout: timeoutSecs, memory: 512 } },
  );
  const runId: string = runRes.data.data.id;
  const defaultDatasetId: string = runRes.data.data.defaultDatasetId;

  // 2. Polling hasta que termine (máx timeoutSecs * 1.5 para dar margen)
  const deadline = Date.now() + timeoutSecs * 1500;
  while (Date.now() < deadline) {
    await sleep(4000);
    const statusRes = await apify.get(`/actor-runs/${runId}`);
    const status: string = statusRes.data.data.status;

    if (status === 'SUCCEEDED') break;
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Actor ${actorId} terminó con estado: ${status}`);
    }
    // RUNNING o READY → seguir esperando
  }

  // 3. Obtener items del dataset
  const dataRes = await apify.get(`/datasets/${defaultDatasetId}/items`, {
    params: { clean: true, format: 'json' },
  });

  return dataRes.data as T[];
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
