/**
 * extraer-emails-web.ts
 * Visita los sitios web de leads sin email real,
 * extrae emails del HTML y actualiza Supabase.
 *
 * Uso: npx tsx scripts/extraer-emails-web.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const ORG_ID        = 'd54f1811-a28e-4de6-aeb8-fceabdfcb6f3';
const DELAY_MS      = 1200;   // pausa entre requests para no ser bloqueados
const TIMEOUT_MS    = 8000;
const MAX_LEADS     = 300;    // límite de seguridad por ejecución

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Dominios de redes sociales — no contienen emails útiles
const SKIP_DOMAINS = [
  'instagram.com', 'facebook.com', 'twitter.com', 'tiktok.com',
  'youtube.com', 'wa.me', 'canva.site', 'google.com', 'linktr.ee',
  'negocio.site', 'blogspot.com', 'wixsite.com',
];

// Emails a ignorar (spam traps, no-reply, etc.)
const SKIP_EMAIL_PATTERNS = [
  'noreply', 'no-reply', 'donotreply', 'example.com',
  'sentry.io', 'wixpress.com', 'wordpress.com',
  '@sin-email', 'privacy@', 'support@wordpress',
];

function extraerEmails(html: string): string[] {
  // Busca mailto: primero (más confiable)
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
  // Luego texto plano
  const textoRegex  = /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g;

  const encontrados = new Set<string>();

  let m;
  while ((m = mailtoRegex.exec(html)) !== null) encontrados.add(m[1].toLowerCase());
  while ((m = textoRegex.exec(html))  !== null) encontrados.add(m[1].toLowerCase());

  return [...encontrados].filter(email =>
    !SKIP_EMAIL_PATTERNS.some(p => email.includes(p)) &&
    email.length < 80
  );
}

function esDominioValido(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return !SKIP_DOMAINS.some(d => hostname.includes(d));
  } catch { return false; }
}

async function fetchConTimeout(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; emailbot/1.0)' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('html')) return null;
    return await res.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🔍 Cargando leads con sitio web y sin email real...\n');

  const { data: leads, error } = await supabase
    .from('Contacto')
    .select('id, nombre, email, webUrl, ciudad, pais')
    .eq('organizacionId', ORG_ID)
    .like('email', '%@sin-email.pendiente')
    .not('webUrl', 'is', null)
    .neq('webUrl', '')
    .limit(MAX_LEADS);

  if (error) { console.error('Error Supabase:', error); process.exit(1); }
  if (!leads?.length) { console.log('✅ No hay leads pendientes.'); return; }

  console.log(`📋 ${leads.length} leads a procesar\n`);

  let actualizados = 0, sinEmail = 0, omitidos = 0, errores = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const web  = lead.webUrl as string;
    const pct  = `[${i+1}/${leads.length}]`;

    if (!esDominioValido(web)) {
      console.log(`${pct} ⏭  ${lead.nombre?.slice(0,40)} — dominio omitido`);
      omitidos++;
      continue;
    }

    process.stdout.write(`${pct} 🌐 ${lead.nombre?.slice(0,40)}... `);

    const html = await fetchConTimeout(web);
    if (!html) {
      console.log('timeout/error');
      errores++;
      await sleep(DELAY_MS);
      continue;
    }

    const emails = extraerEmails(html);
    if (!emails.length) {
      console.log('sin email');
      sinEmail++;
      await sleep(DELAY_MS);
      continue;
    }

    const emailElegido = emails[0];
    const { error: upErr } = await supabase
      .from('Contacto')
      .update({ email: emailElegido, updatedAt: new Date().toISOString() })
      .eq('id', lead.id);

    if (upErr) {
      console.log(`error al guardar: ${upErr.message}`);
      errores++;
    } else {
      console.log(`✅ ${emailElegido}`);
      actualizados++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`
════════════════════════════════
✅ Actualizados:  ${actualizados}
📭 Sin email:     ${sinEmail}
⏭  Omitidos:      ${omitidos}
❌ Errores:       ${errores}
Total procesados: ${leads.length}
════════════════════════════════`);

  // Verificación final en Supabase
  const { count } = await supabase
    .from('Contacto')
    .select('*', { count: 'exact', head: true })
    .eq('organizacionId', ORG_ID)
    .not('email', 'like', '%@sin-email.pendiente');

  console.log(`\n📊 Total leads con email real ahora: ${count}`);
}

main().catch(console.error);
