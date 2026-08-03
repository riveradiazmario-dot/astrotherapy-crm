// ─── Factory de proveedores de email ─────────────────────────────────────────
import { EmailProvider, ProviderConfig } from './provider.interface';
import { ResendProvider } from './resend.provider';
import { SmtpProvider } from './smtp.provider';
import { BrevoProvider } from './brevo.provider';
import { SendGridProvider } from './sendgrid.provider';
import { obtenerSmtpPredeterminado, obtenerSmtpConfigPorId } from '../smtp-config.service';

// ─── Crear proveedor a partir de config ──────────────────────────────────────
export function crearProveedorDesdeConfig(config: ProviderConfig): EmailProvider {
  switch (config.tipo) {
    case 'resend':    return new ResendProvider(config);
    case 'smtp':      return new SmtpProvider(config);
    case 'brevo':     return new BrevoProvider(config);
    case 'sendgrid':  return new SendGridProvider(config);
    default:
      throw new Error(`Proveedor desconocido: ${(config as ProviderConfig).tipo}`);
  }
}

// ─── Obtener el proveedor predeterminado desde DB ─────────────────────────────
export async function obtenerProveedorPredeterminado(
  organizacionId = 'org-luz-holistica',
): Promise<EmailProvider> {
  const config = await obtenerSmtpPredeterminado(organizacionId);
  if (!config) throw new Error('No hay proveedor de email configurado como predeterminado');
  return crearProveedorDesdeConfig(config as ProviderConfig);
}

// ─── Obtener un proveedor específico por ID ───────────────────────────────────
export async function obtenerProveedorPorId(id: string): Promise<EmailProvider> {
  const config = await obtenerSmtpConfigPorId(id);
  if (!config) throw new Error(`Proveedor con id ${id} no encontrado`);
  return crearProveedorDesdeConfig(config as ProviderConfig);
}
