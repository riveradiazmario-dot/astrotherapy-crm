// ─── CRM Luz Holística — Entry Point ─────────────────────────────────────────
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';

import contactosRouter from './routes/contactos';
import scrapingRouter from './routes/scraping';
import mailerliteRouter from './routes/mailerlite';
import emailRouter from './routes/email';
import smtpConfigRouter from './routes/smtp-config';
import automationsRouter from './routes/automations';
import sequencesRouter from './routes/sequences';
import calendlyRouter from './routes/calendly';
import stripeRouter from './routes/stripe';
import authRouter from './routes/auth';
import pipelineRouter from './routes/oportunidades';
import { bootstrapAutomations } from './services/automations/bootstrap';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './logger';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT ?? 3000;

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Interfaz web estática ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Log de cada request ──────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);            // Públicas: registro, login
app.use('/api/contactos', contactosRouter);  // Protegidas por requireAuth
app.use('/api/pipeline', pipelineRouter);    // Protegidas por requireAuth
app.use('/api/scraping', scrapingRouter);    // Protegidas por requireAuth
app.use('/api/mailerlite', mailerliteRouter);
app.use('/api/email', emailRouter);
app.use('/api/smtp-config', smtpConfigRouter);
app.use('/api/automations', automationsRouter);
app.use('/api/sequences', sequencesRouter);
app.use('/api/calendly', calendlyRouter);
app.use('/api/stripe', stripeRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, estado: 'operativo', version: '1.0.0', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false, estado: 'error_db' });
  }
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
      stripe: {
        'POST /api/stripe/webhook': 'Receptor de webhooks Stripe (checkout.session.completed, subscription.deleted)',
        'POST /api/stripe/sync-manual': 'Sync manual de checkout { id, customer_email, ... }',
        'GET  /api/stripe/products': 'Mapeo productos Stripe → etiquetas CRM (14 productos)',
      },
      smtpConfig: {
        'GET  /api/smtp-config': 'Listar cuentas SMTP configuradas (sin password)',
        'POST /api/smtp-config': 'Crear nueva cuenta SMTP { nombre, host, port, usuario, password, fromEmail, fromNombre? }',
        'PUT  /api/smtp-config/:id': 'Actualizar cuenta SMTP',
        'DELETE /api/smtp-config/:id': 'Eliminar cuenta SMTP',
        'POST /api/smtp-config/:id/predeterminado': 'Marcar como cuenta predeterminada',
      },
      mailerlite: {
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
  try {
    await prisma.$connect();
    logger.info('✅ Base de datos conectada');
    bootstrapAutomations();
    logger.info('⚡ Motor de automatizaciones activo');

    app.listen(PORT, () => {
      logger.info(`🚀 CRM corriendo en http://localhost:${PORT}`);
      logger.info(`📋 Endpoints: http://localhost:${PORT}/`);
    });
  } catch (err) {
    logger.error('Error al iniciar:', err);
    process.exit(1);
  }
}

main();
