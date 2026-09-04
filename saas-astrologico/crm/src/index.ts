// ─── CRM Luz Holística — Entry Point ─────────────────────────────────────────
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import WebSocket from 'ws';

// Hacer WebSocket disponible globalmente para Supabase en Node 20
(globalThis as any).WebSocket = WebSocket;

import contactosRouter from './routes/contactos';
import scrapingRouter from './routes/scraping';
import mailerliteRouter from './routes/mailerlite';
import emailRouter from './routes/email';
import smtpConfigRouter from './routes/smtp-config';
import automationsRouter from './routes/automations';
import sequencesRouter from './routes/sequences';
import calendlyRouter from './routes/calendly';
import stripeRouter from './routes/stripe';
import conversacionesRouter from './routes/conversaciones';
import iaRouter from './routes/ia';
import authRouter from './routes/auth';
import pipelineRouter from './routes/oportunidades';
import campanasRouter from './routes/campanas';
import { bootstrapAutomations } from './services/automations/bootstrap';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './logger';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT ?? 3000;

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(cors());

// Stripe webhook necesita raw body para verificar firma
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Resto de rutas usan JSON normal
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Interfaz web estática ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', '_public')));

// ─── Log de cada request ──────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);            // Públicas: registro, login
app.use('/api/contactos', contactosRouter);  // Protegidas por requireAuth
app.use('/api/pipeline', pipelineRouter);    // Protegidas por requireAuth
app.use('/api/campanas', campanasRouter);    // Módulo C — Campaign Builder
app.use('/api/scraping', scrapingRouter);    // Protegidas por requireAuth
app.use('/api/mailerlite', mailerliteRouter);
app.use('/api/email', emailRouter);
app.use('/api/smtp-config', smtpConfigRouter);
app.use('/api/automations', automationsRouter);
app.use('/api/sequences', sequencesRouter);
app.use('/api/calendly', calendlyRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/conversaciones', conversacionesRouter);
app.use('/api/ia', iaRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
// Retorna 200 siempre que Node esté corriendo; el estado de DB es informativo.
app.get('/health', async (_req, res) => {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // DB no disponible — no falla el deploy
  }
  res.json({
    ok: true,
    estado: dbOk ? 'operativo' : 'degradado_sin_db',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Ruta raíz con resumen de endpoints ──────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    nombre: 'CRM Luz Holística',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/registro': 'Crear organización + usuario admin { nombreOrg, nombre, email, password, slugOrg? }',
        'POST /api/auth/login': 'Iniciar sesión { email, password, slugOrg } → JWT',
        'GET  /api/auth/me': 'Perfil del usuario autenticado (Bearer token)',
        'POST /api/auth/usuarios': 'Crear agente en la org (solo admin)',
      },
      contactos: {
        'GET  /api/contactos': 'Listar (con filtros: ?especialidad=&nivel=&pais=&estado=&minScore=&etiqueta=&page=&limit=)',
        'GET  /api/contactos/stats': 'Estadísticas generales',
        'GET  /api/contactos/segmento/:nombre': 'Segmento predefinido (early_adopters|calientes|astrologos_establecidos|sin_contactar|clientes)',
        'GET  /api/contactos/:id': 'Obtener uno',
        'POST /api/contactos': 'Crear nuevo',
        'PUT  /api/contactos/:id': 'Actualizar',
        'DELETE /api/contactos/:id': 'Eliminar',
        'POST /api/contactos/:id/accion': 'Registrar acción y actualizar score',
      },
      scraping: {
        'POST /api/scraping/importar-csv': 'Importar CSV (campo "archivo" en form-data)',
        'POST /api/scraping/importar-json': 'Importar JSON { contactos: [...] }',
        'GET  /api/scraping/plantilla-csv': 'Descargar plantilla CSV vacía',
        'POST /api/scraping/extraer-texto': 'Extraer contactos de texto pegado (Telegram, Facebook...)',
        'GET  /api/scraping/telegram/:username': 'Scrape canal/grupo público de Telegram',
        'GET  /api/scraping/telegram-buscar?q=': 'Buscar grupos de Telegram por término',
        'GET  /api/scraping/instagram/:username': 'Scrape perfil público de Instagram',
        'POST /api/scraping/instagram/lote': 'Scrape batch de perfiles Instagram { usernames: [...] }',
        'POST /api/scraping/buscar-directorios': 'Buscar en web (DuckDuckGo) y Hotmart',
        'GET  /api/scraping/fuentes': 'Listar fuentes disponibles y capacidades',
      },
      email: {
        'GET  /api/email/estado': 'Verificar conexión SMTP (Neubox)',
        'POST /api/email/prueba': 'Enviar email de prueba { para, asunto?, html? }',
        'POST /api/email/enviar': 'Enviar email { para, asunto, html, cc?, cco? }',
        'POST /api/email/campana': 'Envío masivo { asunto, html, segmento?, pausaMs? }',
        'POST /api/email/bienvenida/:contactoId': 'Email de bienvenida al contacto',
        'POST /api/email/seguimiento/:contactoId': 'Email de seguimiento al contacto',
      },
      sequences: {
        'GET  /api/sequences': 'Listar secuencias con sus pasos',
        'POST /api/sequences': 'Crear secuencia con pasos { nombre, descripcion?, pasos?: [{tipo, config?, condicion_skip?}] }',
        'GET  /api/sequences/:id': 'Obtener secuencia + pasos',
        'PUT  /api/sequences/:id': 'Actualizar metadatos de secuencia',
        'DELETE /api/sequences/:id': 'Eliminar secuencia',
        'POST /api/sequences/:id/pasos': 'Agregar paso { tipo, config?, condicion_skip?, orden? }',
        'PUT  /api/sequences/pasos/:pasoId': 'Actualizar paso',
        'DELETE /api/sequences/pasos/:pasoId': 'Eliminar paso',
      },
      calendly: {
        'POST /api/calendly/webhook': 'Receptor de webhooks Calendly (invitee.created / invitee.canceled)',
        'POST /api/calendly/sync-manual': 'Sync manual de un booking { event, invitee, eventTypeSlug? }',
        'GET  /api/calendly/event-types': 'Mapeo slugs Calendly → etiquetas CRM',
      },
      conversaciones: {
        'GET  /api/conversaciones/:contactoId': 'Listar hilos del contacto',
        'GET  /api/conversaciones/:contactoId/timeline': 'Timeline unificado de mensajes',
        'GET  /api/conversaciones/hilo/:conversacionId': 'Mensajes de un hilo',
        'POST /api/conversaciones/mensaje': 'Registrar mensaje { contactoId, contenido, canal?, direccion?, tipo? }',
        'POST /api/conversaciones/hilo/:id/cerrar': 'Cerrar hilo',
      },
      stripe: {
        'POST /api/stripe/webhook': 'Receptor de webhooks Stripe (checkout.session.completed, subscription.deleted)',
        'POST /api/stripe/sync-manual': 'Sync manual de checkout { id, customer_email, ... }',
        'GET  /api/stripe/products': 'Mapeo productos Stripe → etiquetas CRM (14 productos)',
      },
      ia: {
        'GET  /api/ia/:contactoId/score': 'Calcular leadScore (sin guardar) — muestra factores',
        'POST /api/ia/:contactoId/score/aplicar': 'Calcular y guardar leadScore',
        'POST /api/ia/scores/recalcular': 'Batch: recalcular scores de todos los contactos',
        'GET  /api/ia/:contactoId/resumen': 'Resumen ejecutivo del contacto (perfil, riesgo, valor)',
        'GET  /api/ia/:contactoId/sugerencias': 'Sugerencias de próximo paso con plantillas',
        'GET  /api/ia/:contactoId/completo': 'Score + resumen + sugerencias en una sola llamada',
      },
      smtpConfig: {
        'GET  /api/smtp-config': 'Listar cuentas SMTP configuradas (sin password)',
        'POST /api/smtp-config': 'Crear nueva cuenta SMTP { nombre, host, port, usuario, password, fromEmail, fromNombre? }',
        'PUT  /api/smtp-config/:id': 'Actualizar cuenta SMTP',
        'DELETE /api/smtp-config/:id': 'Eliminar cuenta SMTP',
        'POST /api/smtp-config/:id/predeterminado': 'Marcar como cuenta predeterminada',
      },
      campanas: {        'GET  /api/campanas': 'Listar campañas (?estado=&tipo=&page=&limit=)',        'GET  /api/campanas/stats': 'Estadísticas globales de campañas',        'GET  /api/campanas/:id': 'Detalle de una campaña',        'POST /api/campanas': 'Crear campaña { nombre, descripcion?, tipo?, segmento?, asunto?, html? }',        'PUT  /api/campanas/:id': 'Actualizar campaña',        'DELETE /api/campanas/:id': 'Eliminar campaña',        'POST /api/campanas/:id/enviar': 'Lanzar campaña (envío masivo asíncrono)',        'POST /api/campanas/:id/duplicar': 'Clonar campaña como borrador',        'GET  /api/campanas/:id/preview': 'Ver cuántos contactos recibirían la campaña',      },      mailerlite: {
        'POST /api/mailerlite/sincronizar': 'Sincronizar todos los contactos con consentimiento',
        'POST /api/mailerlite/sincronizar/:id': 'Sincronizar un contacto',
        'GET  /api/mailerlite/estadisticas': 'Estadísticas de campañas',
        'GET  /api/mailerlite/grupos': 'Listar grupos de MailerLite',
      },
    },
  });
});

// ─── Error handler global ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Arranque ─────────────────────────────────────────────────────────────────
async function main() {
  // Prisma conecta de forma lazy en la primera query; no bloqueamos el arranque.
  try {
    await prisma.$connect();
    logger.info('✅ Base de datos conectada');
  } catch (err) {
    logger.warn('⚠️  DB no disponible al arrancar (se reintentará en primera query):', err);
  }

  try {
    bootstrapAutomations();
    logger.info('⚡ Motor de automatizaciones activo');
  } catch (err) {
    logger.warn('⚠️  bootstrapAutomations falló (no fatal):', err);
  }

  app.listen(PORT, () => {
    logger.info(`🚀 CRM corriendo en http://localhost:${PORT}`);
    logger.info(`📋 Endpoints: http://localhost:${PORT}/`);
  });
}

main();
