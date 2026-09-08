// ─── Servicio SMTP Config — gestión de cuentas SMTP desde PostgreSQL ──────────
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type SmtpConfig = {
  id: string;
  nombre: string;
  tipo: string;
  api_key: string | null;
  host: string | null;
  port: number | null;
  secure: boolean | null;
  usuario: string | null;
  password: string | null;
  fromEmail: string;
  fromNombre: string;
  activo: boolean;
  predeterminado: boolean;
  organizacionId: string;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Obtener config predeterminada ───────────────────────────────────────────
export async function obtenerSmtpPredeterminado(
  organizacionId = 'org-luz-holistica',
): Promise<SmtpConfig | null> {
  const config = await prisma.smtpConfig.findFirst({
    where: {
      organizacionId,
      predeterminado: true,
      activo: true,
    },
  });
  return config || null;
}

// ─── Obtener config por ID (incluye password — uso interno) ──────────────────
export async function obtenerSmtpConfigPorId(id: string): Promise<SmtpConfig | null> {
  const config = await prisma.smtpConfig.findUnique({
    where: { id },
  });
  return config || null;
}

// ─── Listar todas las configs ─────────────────────────────────────────────────
export async function listarSmtpConfigs(
  organizacionId = 'org-luz-holistica',
): Promise<Omit<SmtpConfig, 'password'>[]> {
  const configs = await prisma.smtpConfig.findMany({
    where: { organizacionId },
    orderBy: { predeterminado: 'desc' },
  });

  return configs.map(({ password, ...rest }) => rest) as Omit<SmtpConfig, 'password'>[];
}

// ─── Crear nueva config ───────────────────────────────────────────────────────
export async function crearSmtpConfig(
  payload: Omit<SmtpConfig, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<SmtpConfig> {
  // Si es predeterminado, quitar el flag de las demás
  if (payload.predeterminado) {
    await prisma.smtpConfig.updateMany({
      where: { organizacionId: payload.organizacionId },
      data: { predeterminado: false },
    });
  }

  const config = await prisma.smtpConfig.create({
    data: payload as any,
  });

  return config;
}

// ─── Actualizar config ────────────────────────────────────────────────────────
export async function actualizarSmtpConfig(
  id: string,
  payload: Partial<SmtpConfig>,
): Promise<SmtpConfig> {
  if (payload.predeterminado) {
    const config = await prisma.smtpConfig.findUnique({
      where: { id },
      select: { organizacionId: true },
    });
    if (config) {
      await prisma.smtpConfig.updateMany({
        where: { organizacionId: config.organizacionId },
        data: { predeterminado: false },
      });
    }
  }

  const updated = await prisma.smtpConfig.update({
    where: { id },
    data: payload,
  }) as any;

  return updated;
}

// ─── Eliminar config ──────────────────────────────────────────────────────────
export async function eliminarSmtpConfig(id: string): Promise<void> {
  await prisma.smtpConfig.delete({
    where: { id },
  });
}

// ─── Marcar como predeterminado ───────────────────────────────────────────────
export async function marcarPredeterminado(
  id: string,
  organizacionId = 'org-luz-holistica',
): Promise<void> {
  await prisma.smtpConfig.updateMany({
    where: { organizacionId },
    data: { predeterminado: false },
  });

  await prisma.smtpConfig.update({
    where: { id },
    data: { predeterminado: true },
  });
}
