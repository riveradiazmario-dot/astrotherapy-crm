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
    asunto: '¡Bienvenido a Astrología Terapéutica e Integración Energética!',
    html: `
<div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #f5f3f0 0%, #fff 100%); padding: 0;">
  <!-- Header with branding -->
  <div style="background: #1e1233; padding: 30px 20px; text-align: center; border-bottom: 3px solid #d4a373;">
    <h2 style="color: #d4a373; margin: 0; font-size: 24px; font-weight: normal; letter-spacing: 1px;">✨ Astrología Terapéutica ✨</h2>
    <p style="color: #d4a373; margin: 8px 0 0 0; font-size: 14px; letter-spacing: 0.5px;">Integración Energética</p>
  </div>

  <!-- Content -->
  <div style="padding: 40px 30px;">
    <h1 style="color: #1e1233; font-size: 28px; margin: 0 0 20px 0; text-align: center;">¡Bienvenido a tu Transformación!</h1>

    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Nos alegra enormemente que hayas decidido acompañarnos en este camino de autoconocimiento y sanación integral.
    </p>

    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      En el Instituto de Astrología Terapéutica e Integración Energética, creemos que tus astros guardan mensajes profundos para tu vida. Nuestro propósito es ayudarte a descodificar esos mensajes y acceder a tu sabiduría interior.
    </p>

    <div style="background: #f0e6d8; border-left: 4px solid #d4a373; padding: 20px; margin: 30px 0; border-radius: 4px;">
      <h3 style="color: #1e1233; margin: 0 0 15px 0; font-size: 18px;">Nuestros Servicios:</h3>
      <ul style="color: #333; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>Astrología Natal y Tránsitos:</strong> Comprende tu propósito y ciclos de vida</li>
        <li><strong>Tarot Terapéutico:</strong> Claridad y orientación desde la sabiduría arquetípica</li>
        <li><strong>Integración Energética:</strong> Armonización del cuerpo físico y energético</li>
        <li><strong>Cursos y Formaciones:</strong> Programas diseñados para tu crecimiento integral</li>
      </ul>
    </div>

    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>¿Listo para tu primer paso?</strong> Agenda una consulta y descubre qué tus astros tienen para ti en este momento de tu vida.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://wa.me/5255651841 5" style="background: #d4a373; color: #1e1233; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-family: Arial, sans-serif;">Agendar Consulta por WhatsApp</a>
    </div>

    <p style="color: #666; font-size: 14px; text-align: center; margin: 20px 0;">O contacta directamente:</p>
    <p style="color: #d4a373; font-size: 14px; text-align: center; margin: 0; font-weight: bold;">📱 +52 555 651 8415</p>
    <p style="color: #d4a373; font-size: 14px; text-align: center; margin: 5px 0;">📧 contacto@luzholistica.com.mx</p>
  </div>

  <!-- Footer -->
  <div style="background: #1e1233; padding: 20px; text-align: center; border-top: 3px solid #d4a373;">
    <p style="color: #d4a373; margin: 0; font-size: 12px; letter-spacing: 0.5px;">Instituto de Astrología Terapéutica e Integración Energética</p>
    <p style="color: #999; margin: 8px 0 0 0; font-size: 11px;">Tu camino hacia la autenticidad y la sanación</p>
  </div>
</div>
    `.trim(),
  },
  {
    nombre: 'seguimiento',
    asunto: 'Tu Carta Astral te Espera — Próximos Pasos',
    html: `
<div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #f5f3f0 0%, #fff 100%); padding: 0;">
  <!-- Header -->
  <div style="background: #1e1233; padding: 30px 20px; text-align: center; border-bottom: 3px solid #d4a373;">
    <h2 style="color: #d4a373; margin: 0; font-size: 24px; font-weight: normal; letter-spacing: 1px;">✨ Profundiza en tu Camino ✨</h2>
  </div>

  <!-- Content -->
  <div style="padding: 40px 30px;">
    <h1 style="color: #1e1233; font-size: 28px; margin: 0 0 20px 0; text-align: center;">Continuemos tu Viaje de Transformación</h1>

    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Esperamos que hayas sentido la resonancia de nuestro primer encuentro. Ahora es momento de ir más profundo y acceder a los mensajes que tus astros tienen especialmente para ti.
    </p>

    <div style="background: #f0e6d8; border-left: 4px solid #d4a373; padding: 20px; margin: 30px 0; border-radius: 4px;">
      <h3 style="color: #1e1233; margin: 0 0 15px 0; font-size: 18px;">Servicios Complementarios:</h3>
      <ul style="color: #333; margin: 0; padding-left: 20px; line-height: 1.8; font-size: 15px;">
        <li><strong>Lectura de Carta Natal Completa:</strong> Análisis profundo de tu psicología cósmica</li>
        <li><strong>Tránsitos Personalizados:</strong> Entiende los ciclos actuales de tu vida</li>
        <li><strong>Sesión Combinada (Astrología + Tarot):</strong> Doble perspectiva para decisiones importantes</li>
        <li><strong>Integración Energética Individual:</strong> Sanación personalizada según tus necesidades</li>
      </ul>
    </div>

    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Cada servicio está diseñado para acompañarte en momentos clave de tu evolución. <strong>¿Cuál resuena contigo en este momento?</strong>
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://wa.me/55256518415" style="background: #d4a373; color: #1e1233; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-family: Arial, sans-serif;">Reservar Cita Ahora</a>
    </div>

    <p style="color: #666; font-size: 14px; text-align: center; margin: 20px 0;">Disponibles citas online y presenciales</p>
  </div>

  <!-- Footer -->
  <div style="background: #1e1233; padding: 20px; text-align: center; border-top: 3px solid #d4a373;">
    <p style="color: #d4a373; margin: 0; font-size: 12px;">📱 +52 555 651 8415 | 📧 contacto@luzholistica.com.mx</p>
    <p style="color: #999; margin: 8px 0 0 0; font-size: 11px;">Instituto de Astrología Terapéutica e Integración Energética</p>
  </div>
</div>
    `.trim(),
  },
  {
    nombre: 're-engagement',
    asunto: '✨ Te Extrañamos — Una Invitación Especial',
    html: `
<div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #f5f3f0 0%, #fff 100%); padding: 0;">
  <!-- Header -->
  <div style="background: #1e1233; padding: 30px 20px; text-align: center; border-bottom: 3px solid #d4a373;">
    <h2 style="color: #d4a373; margin: 0; font-size: 24px; font-weight: normal; letter-spacing: 1px;">✨ Tu Espacio de Sanación ✨</h2>
    <p style="color: #d4a373; margin: 8px 0 0 0; font-size: 14px;">Te Invita a Regresar</p>
  </div>

  <!-- Content -->
  <div style="padding: 40px 30px;">
    <h1 style="color: #1e1233; font-size: 28px; margin: 0 0 20px 0; text-align: center;">Regresa a Tu Camino de Transformación</h1>

    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Ha pasado tiempo, y notamos tu ausencia. En este Instituto de Astrología Terapéutica e Integración Energética, creemos que cada encuentro deja una huella. Tu camino de sanación continúa esperándote.
    </p>

    <div style="background: #f0e6d8; border-left: 4px solid #d4a373; padding: 20px; margin: 30px 0; border-radius: 4px;">
      <h3 style="color: #1e1233; margin: 0 0 15px 0; font-size: 18px;">🎁 Especial de Reactivación:</h3>
      <ul style="color: #333; margin: 0; padding-left: 20px; line-height: 1.8; font-size: 15px;">
        <li><strong>20% descuento</strong> en tu próxima consulta de Astrología</li>
        <li><strong>Sesión de Tarot Terapéutico gratis</strong> (evaluación energética)</li>
        <li><strong>Integración Energética especial</strong> para liberar bloqueos</li>
        <li><strong>Acceso privilegiado</strong> a nuestros nuevos cursos de formación</li>
      </ul>
    </div>

    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>Este año es tu año de transformación.</strong> Los astros te llaman a regresar. Déjate guiar por la sabiduría que ya conoces y expande tus horizontes espirituales.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://wa.me/55256518415" style="background: #d4a373; color: #1e1233; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-family: Arial, sans-serif;">Retomar Mi Camino</a>
    </div>

    <p style="color: #666; font-size: 14px; text-align: center; margin: 20px 0;">Tu descuento especial es válido hasta fin de mes</p>
  </div>

  <!-- Footer -->
  <div style="background: #1e1233; padding: 20px; text-align: center; border-top: 3px solid #d4a373;">
    <p style="color: #d4a373; margin: 0; font-size: 12px; letter-spacing: 0.5px;">Instituto de Astrología Terapéutica e Integración Energética</p>
    <p style="color: #999; margin: 8px 0 0 0; font-size: 11px;">📱 +52 555 651 8415 | Tu Espacio de Sanación y Transformación</p>
  </div>
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
