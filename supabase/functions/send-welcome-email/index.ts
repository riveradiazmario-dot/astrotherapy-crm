// ─── Edge Function: send-welcome-email ───────────────────────────────────────
// Se dispara vía Supabase Database Webhook al insertar en tabla `leads`
// Obtiene la config SMTP predeterminada y envía email de bienvenida

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface Lead {
  nombre: string;
  email: string;
  telefono?: string;
  origen?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  usuario: string;
  password: string;
  fromEmail: string;
  fromNombre: string;
}

async function enviarEmail(smtp: SmtpConfig, lead: Lead): Promise<boolean> {
  // Usamos el SMTP de Neubox vía fetch a la API de nodemailer-as-a-service
  // Como Deno no tiene nodemailer, llamamos al endpoint del CRM si está disponible,
  // o usamos smtp directo con la librería smtp de Deno
  const smtpLib = await import('https://deno.land/x/denomailer@1.6.0/mod.ts');

  const client = smtpLib.SMTPClient
    ? new smtpLib.SMTPClient({
        connection: {
          hostname: smtp.host,
          port: smtp.port,
          tls: smtp.secure,
          auth: { username: smtp.usuario, password: smtp.password },
        },
      })
    : null;

  if (!client) return false;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#6b46c1">Hola ${lead.nombre ?? 'colega'}, bienvenido/a 🌟</h2>
      <p>Gracias por tu interés en <strong>AstroTherapy Pro</strong>.</p>
      <p>Somos el único software en español que integra carta natal e interpretaciones terapéuticas, diseñado para astrólogos y terapeutas holísticos en LATAM.</p>
      <p>Agenda tu demo personalizada y descubre cómo AstroTherapy Pro puede transformar tu práctica:</p>
      <a href="https://calendly.com/bioastrologia/demo-de-astrotherapy-pro"
         style="display:inline-block;background:#6b46c1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
        Agenda tu Demo Gratuita →
      </a>
      <p style="color:#666;font-size:13px;margin-top:30px">
        Mario Rivera · AstroTherapy Pro<br>
        <a href="mailto:contacto@luzholistica.com.mx">contacto@luzholistica.com.mx</a>
      </p>
    </div>
  `;

  try {
    await client.send({
      from: `${smtp.fromNombre} <${smtp.fromEmail}>`,
      to: lead.email,
      subject: `¡Hola ${lead.nombre ?? 'colega'}! Tu demo de AstroTherapy Pro te espera 🌟`,
      html,
    });
    await client.close();
    return true;
  } catch (e) {
    console.error('Error SMTP:', e);
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    // El webhook de Supabase envía { type, table, record, old_record }
    const lead: Lead = body.record ?? body;

    if (!lead.email) {
      return new Response(JSON.stringify({ ok: false, error: 'Sin email' }), { status: 400 });
    }

    // Obtener config SMTP predeterminada
    const { data: smtp, error } = await supabase
      .from('smtp_configs')
      .select('*')
      .eq('predeterminado', true)
      .eq('activo', true)
      .single();

    if (error || !smtp || smtp.password === 'SMTP_PASS_PENDIENTE') {
      console.warn('SMTP no configurado todavía');
      return new Response(JSON.stringify({ ok: false, error: 'SMTP no configurado' }), { status: 503 });
    }

    const enviado = await enviarEmail(smtp as SmtpConfig, lead);

    return new Response(JSON.stringify({ ok: enviado }), {
      status: enviado ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});
