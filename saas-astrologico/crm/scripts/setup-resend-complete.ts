// ─── Setup Resend Completo: Configuración + Templates + Secuencias ────────────
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_REPLACE_WITH_YOUR_API_KEY';
const FROM_EMAIL = 'contacto@luzholistica.com.mx';
const FROM_NOMBRE = 'Luz Holística';
const ORG_ID = 'org-luz-holistica';

interface EmailTemplate {
  nombre: string;
  asunto: string;
  html: string;
}

const TEMPLATES: EmailTemplate[] = [
  {
    nombre: 'bienvenida',
    asunto: '¡Bienvenida a Luz Holística!',
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e1233;">¡Bienvenido a Luz Holística!</h1>
  <p>Hola,</p>
  <p>Gracias por tu interés en nuestros servicios de astrología terapéutica e integración energética.</p>
  <p>Aquí encontrarás:</p>
  <ul>
    <li>Consultas personalizadas de astrología</li>
    <li>Tarot terapéutico</li>
    <li>Sesiones de integración energética</li>
    <li>Cursos y talleres especializados</li>
  </ul>
  <p>Si tienes alguna pregunta, no dudes en escribirnos a contacto@luzholistica.com.mx o al WhatsApp <strong>+52 555 651 8415</strong></p>
  <hr style="border: none; border-top: 1px solid #d4a373; margin: 30px 0;">
  <p style="font-size: 12px; color: #666;">Instituto de Astrología Terapéutica e Integración Energética</p>
</div>
    `.trim(),
  },
  {
    nombre: 'seguimiento',
    asunto: 'Próximo paso en tu camino holístico',
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e1233;">Continuemos tu viaje holístico</h1>
  <p>Hola,</p>
  <p>Nos gustaría saber cómo te va. ¿Hay algo que podamos ayudarte con nuestros servicios?</p>
  <p>Ofrecemos:</p>
  <ul>
    <li><strong>Consulta de Astrología Natal:</strong> Descubre tu propósito según tus astros</li>
    <li><strong>Sesión de Tarot Terapéutico:</strong> Claridad y orientación para decisiones importantes</li>
    <li><strong>Sesión de Integración Energética:</strong> Sanación y armonización del cuerpo energético</li>
  </ul>
  <p><strong>Agenda tu consulta:</strong> +52 555 651 8415</p>
  <hr style="border: none; border-top: 1px solid #d4a373; margin: 30px 0;">
  <p style="font-size: 12px; color: #666;">Instituto de Astrología Terapéutica e Integración Energética</p>
</div>
    `.trim(),
  },
  {
    nombre: 're-engagement',
    asunto: 'Te extrañamos — ofertas especiales para ti',
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1e1233;">Una oportunidad especial para ti</h1>
  <p>Hola,</p>
  <p>Hace tiempo que no nos vemos. Queremos recordarte que seguimos aquí para acompañarte en tu camino de crecimiento y sanación.</p>
  <p><strong>Ofertas especiales este mes:</strong></p>
  <ul>
    <li>10% de descuento en consultas de astrología</li>
    <li>Sesión de tarot gratis (primera vez o reactivación)</li>
    <li>Acceso a nuevo curso de astrología aplicada</li>
  </ul>
  <p>¿Nos reencontramos? Escribe a contacto@luzholistica.com.mx o llama al +52 555 651 8415</p>
  <hr style="border: none; border-top: 1px solid #d4a373; margin: 30px 0;">
  <p style="font-size: 12px; color: #666;">Instituto de Astrología Terapéutica e Integración Energética</p>
</div>
    `.trim(),
  },
];

async function setupResend() {
  console.log('🚀 Iniciando setup completo de Resend...\n');

  try {
    // 1. Crear configuración SMTP de Resend
    console.log('1️⃣ Configurando Resend como proveedor SMTP...');
    const smtpConfig = await prisma.smtpConfig.create({
      data: {
        nombre: 'Resend — Luz Holística',
        tipo: 'resend',
        api_key: RESEND_API_KEY,
        fromEmail: FROM_EMAIL,
        fromNombre: FROM_NOMBRE,
        activo: true,
        predeterminado: true,
        organizacionId: ORG_ID,
      },
    });
    console.log(`✅ Configuración Resend creada (ID: ${smtpConfig.id})\n`);

    // 2. Crear secuencia de bienvenida mejorada
    console.log('2️⃣ Creando secuencias de email...');

    const secuenciaBienvenida = await prisma.secuencia.upsert({
      where: { id: 'seq-bienvenida-luz' },
      update: {},
      create: {
        id: 'seq-bienvenida-luz',
        nombre: 'Bienvenida Automática',
        descripcion: 'Secuencia de bienvenida para nuevos contactos',
        tipo: 'bienvenida',
        activo: true,
        organizacionId: ORG_ID,
      },
    });

    // Paso 1: Email de bienvenida inmediato
    await prisma.paso.upsert({
      where: { id: 'paso-bienvenida-1' },
      update: {},
      create: {
        id: 'paso-bienvenida-1',
        secuenciaId: secuenciaBienvenida.id,
        orden: 1,
        tipo: 'send_email',
        config: {
          subject: TEMPLATES[0].asunto,
          htmlBody: TEMPLATES[0].html,
          replyTo: FROM_EMAIL,
        },
        condicion_skip: null,
      },
    });

    // Paso 2: Email de seguimiento (después de 3 días)
    await prisma.paso.upsert({
      where: { id: 'paso-bienvenida-2' },
      update: {},
      create: {
        id: 'paso-bienvenida-2',
        secuenciaId: secuenciaBienvenida.id,
        orden: 2,
        tipo: 'send_email',
        config: {
          subject: TEMPLATES[1].asunto,
          htmlBody: TEMPLATES[1].html,
          replyTo: FROM_EMAIL,
          delayDays: 3,
        },
        condicion_skip: null,
      },
    });

    console.log(`✅ Secuencia "Bienvenida Automática" creada con 2 pasos\n`);

    // 3. Crear secuencia de re-engagement
    const secuenciaReengagement = await prisma.secuencia.upsert({
      where: { id: 'seq-reengagement' },
      update: {},
      create: {
        id: 'seq-reengagement',
        nombre: 'Re-engagement',
        descripcion: 'Secuencia para re-activar contactos inactivos',
        tipo: 'reengagement',
        activo: true,
        organizacionId: ORG_ID,
      },
    });

    await prisma.paso.upsert({
      where: { id: 'paso-reeng-1' },
      update: {},
      create: {
        id: 'paso-reeng-1',
        secuenciaId: secuenciaReengagement.id,
        orden: 1,
        tipo: 'send_email',
        config: {
          subject: TEMPLATES[2].asunto,
          htmlBody: TEMPLATES[2].html,
          replyTo: FROM_EMAIL,
        },
        condicion_skip: null,
      },
    });

    console.log(`✅ Secuencia "Re-engagement" creada\n`);

    // 4. Crear automatización para contacto.creado
    console.log('3️⃣ Configurando automatización de bienvenida...');

    const automacionBienvenida = await prisma.automatizacion.upsert({
      where: { id: 'auto-contacto-creado' },
      update: {},
      create: {
        id: 'auto-contacto-creado',
        nombre: 'Enviar bienvenida a nuevo contacto',
        descripcion: 'Dispara secuencia de bienvenida cuando se crea un contacto',
        trigger_evento: 'contacto.creado',
        trigger_condiciones: null,
        secuenciaId: secuenciaBienvenida.id,
        organizacionId: ORG_ID,
      },
    });

    console.log(`✅ Automatización "contacto.creado" configurada\n`);

    // 5. Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ SETUP RESEND COMPLETADO');
    console.log('════════════════════════════════════════════════════════════\n');

    console.log('📊 CONFIGURACIÓN CREADA:');
    console.log(`├─ SMTP Config: ${smtpConfig.nombre}`);
    console.log(`│  └─ Tipo: ${smtpConfig.tipo}`);
    console.log(`│  └─ From: ${smtpConfig.fromNombre} <${smtpConfig.fromEmail}>`);
    console.log(`│  └─ Predeterminado: ✅`);
    console.log(`├─ Secuencia: Bienvenida Automática`);
    console.log(`│  └─ Pasos: 2 (Bienvenida + Seguimiento)`);
    console.log(`├─ Secuencia: Re-engagement`);
    console.log(`│  └─ Pasos: 1 (Re-engagement)`);
    console.log(`└─ Automatización: contacto.creado → Bienvenida\n`);

    console.log('📧 TEMPLATES CONFIGURADOS:');
    TEMPLATES.forEach((t, i) => {
      console.log(`${i + 1}. ${t.nombre.toUpperCase()}`);
      console.log(`   └─ ${t.asunto}\n`);
    });

    console.log('🎯 PRÓXIMOS PASOS:');
    console.log('1. Probar enviando un email de prueba');
    console.log('2. Crear nuevo contacto para verificar automatización');
    console.log('3. Configurar más secuencias según necesidad\n');

  } catch (error) {
    console.error('❌ Error en setup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupResend();
