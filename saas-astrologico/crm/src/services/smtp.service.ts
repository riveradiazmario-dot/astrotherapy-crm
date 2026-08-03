// ─── Servicio de email — orquesta proveedores via factory ────────────────────
// El proveedor activo se resuelve desde DB (smtp_configs).
// Para cambiar de Resend a Brevo o SMTP: solo cambiar la fila predeterminada en DB.

import { obtenerProveedorPredeterminado, obtenerProveedorPorId } from './email/provider.factory';
import { EmailPayload, ResultadoEnvio } from './email/provider.interface';

export type { EmailPayload, ResultadoEnvio };

// ─── Verificar conexión del proveedor predeterminado ─────────────────────────
export async function verificarConexionSmtp() {
  try {
    const proveedor = await obtenerProveedorPredeterminado();
    return await proveedor.verify();
  } catch (err) {
    return { ok: false, mensaje: (err as Error).message, proveedor: 'desconocido' };
  }
}

// ─── Enviar un email (proveedor predeterminado) ───────────────────────────────
export async function enviarEmail(
  payload: EmailPayload,
  proveedorId?: string,
): Promise<ResultadoEnvio> {
  try {
    const proveedor = proveedorId
      ? await obtenerProveedorPorId(proveedorId)
      : await obtenerProveedorPredeterminado();
    return await proveedor.send(payload);
  } catch (err) {
    return { ok: false, error: (err as Error).message, para: payload.para, proveedor: 'error' };
  }
}

// ─── Envío masivo con pausa anti-spam ────────────────────────────────────────
export interface ResultadoCampana {
  total: number;
  enviados: number;
  fallidos: number;
  proveedor: string;
  detalles: ResultadoEnvio[];
}

export async function enviarCampana(
  destinatarios: { email: string; nombre?: string }[],
  asunto: string,
  htmlTemplate: string,
  pausaMs = 500,
  proveedorId?: string,
): Promise<ResultadoCampana> {
  const proveedor = proveedorId
    ? await obtenerProveedorPorId(proveedorId)
    : await obtenerProveedorPredeterminado();

  const detalles: ResultadoEnvio[] = [];
  let enviados = 0;
  let fallidos = 0;

  for (const dest of destinatarios) {
    const html = htmlTemplate
      .replace(/\{\{nombre\}\}/g, dest.nombre ?? 'Colega')
      .replace(/\{\{email\}\}/g,  dest.email);

    const resultado = await proveedor.send({ para: dest.email, asunto, html });
    detalles.push(resultado);
    if (resultado.ok) enviados++; else fallidos++;
    if (pausaMs > 0) await new Promise(r => setTimeout(r, pausaMs));
  }

  return { total: destinatarios.length, enviados, fallidos, proveedor: proveedor.nombre, detalles };
}

// ─── Templates predefinidos ───────────────────────────────────────────────────
export const templates = {
  bienvenida: (nombre: string) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#6b46c1">Hola ${nombre}, bienvenido/a 🌟</h2>
      <p>Gracias por tu interés en <strong>AstroTherapy Pro</strong>.</p>
      <p>Agenda tu demo personalizada y descubre cómo integrar la astrología en tu práctica terapéutica.</p>
      <a href="https://calendly.com/bioastrologia/demo-de-astrotherapy-pro"
         style="display:inline-block;background:#6b46c1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
        Agenda tu Demo Gratuita →
      </a>
      <p style="color:#666;font-size:13px;margin-top:30px">
        Mario Rivera · AstroTherapy Pro<br>
        <a href="mailto:contacto@luzholistica.com.mx">contacto@luzholistica.com.mx</a>
      </p>
    </div>
  `,
  seguimiento: (nombre: string) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#6b46c1">Hola ${nombre},</h2>
      <p>Solo quería hacer un seguimiento sobre tu interés en <strong>AstroTherapy Pro</strong>.</p>
      <p>¿Tienes 20 minutos esta semana para que te muestre cómo funciona en vivo?</p>
      <a href="https://calendly.com/bioastrologia/demo-de-astrotherapy-pro"
         style="display:inline-block;background:#6b46c1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
        Ver horarios disponibles →
      </a>
      <p style="color:#666;font-size:13px;margin-top:30px">Mario Rivera · AstroTherapy Pro</p>
    </div>
  `,
};
