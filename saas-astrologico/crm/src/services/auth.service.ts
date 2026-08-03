// ─── Servicio de Autenticación ────────────────────────────────────────────────
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET ?? 'cambia-este-secreto-en-produccion';
const JWT_EXPIRES = '7d';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  id: string;
  organizacionId: string;
  rol: 'admin' | 'agente';
  email: string;
  nombre: string;
}

export interface RegistroDTO {
  nombreOrg: string;    // nombre de la organización
  slugOrg?: string;     // se genera automáticamente si no se provee
  nombre: string;       // nombre del usuario admin
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
  slugOrg: string;      // necesario para identificar la organización
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generarSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

// ─── Registro: crea organización + usuario admin ─────────────────────────────

export async function registrarOrganizacion(dto: RegistroDTO) {
  const slug = dto.slugOrg || generarSlug(dto.nombreOrg);

  // Verificar que el slug no exista
  const slugExistente = await prisma.organizacion.findUnique({ where: { slug } });
  if (slugExistente) {
    throw new Error(`Ya existe una organización con el identificador "${slug}". Usa uno diferente.`);
  }

  // Hashear password
  const passwordHash = await bcrypt.hash(dto.password, 12);

  // Crear organización y usuario admin en una transacción
  const resultado = await prisma.$transaction(async (tx) => {
    const org = await tx.organizacion.create({
      data: { nombre: dto.nombreOrg, slug },
    });

    const usuario = await tx.usuario.create({
      data: {
        nombre: dto.nombre,
        email: dto.email.toLowerCase().trim(),
        password: passwordHash,
        rol: 'admin',
        organizacionId: org.id,
      },
    });

    return { org, usuario };
  });

  const token = generarToken(resultado.usuario.id, resultado.org.id, 'admin', resultado.usuario.email, resultado.usuario.nombre);

  return {
    token,
    usuario: {
      id: resultado.usuario.id,
      nombre: resultado.usuario.nombre,
      email: resultado.usuario.email,
      rol: 'admin',
    },
    organizacion: {
      id: resultado.org.id,
      nombre: resultado.org.nombre,
      slug: resultado.org.slug,
    },
  };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUsuario(dto: LoginDTO) {
  // Encontrar organización por slug
  const org = await prisma.organizacion.findUnique({
    where: { slug: dto.slugOrg },
  });
  if (!org || !org.activa) {
    throw new Error('Organización no encontrada o inactiva.');
  }

  // Encontrar usuario en esa organización
  const usuario = await prisma.usuario.findFirst({
    where: {
      email: dto.email.toLowerCase().trim(),
      organizacionId: org.id,
      activo: true,
    },
  });
  if (!usuario) {
    throw new Error('Email o contraseña incorrectos.');
  }

  // Verificar contraseña
  const passwordOk = await bcrypt.compare(dto.password, usuario.password);
  if (!passwordOk) {
    throw new Error('Email o contraseña incorrectos.');
  }

  const token = generarToken(usuario.id, org.id, usuario.rol as 'admin' | 'agente', usuario.email, usuario.nombre);

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    },
    organizacion: {
      id: org.id,
      nombre: org.nombre,
      slug: org.slug,
    },
  };
}

// ─── Crear usuario adicional (solo admins) ────────────────────────────────────

export async function crearUsuario(dto: {
  nombre: string;
  email: string;
  password: string;
  rol?: 'admin' | 'agente';
  organizacionId: string;
}) {
  const existente = await prisma.usuario.findFirst({
    where: { email: dto.email.toLowerCase().trim(), organizacionId: dto.organizacionId },
  });
  if (existente) throw new Error('Ya existe un usuario con ese email en esta organización.');

  const passwordHash = await bcrypt.hash(dto.password, 12);

  const usuario = await prisma.usuario.create({
    data: {
      nombre: dto.nombre,
      email: dto.email.toLowerCase().trim(),
      password: passwordHash,
      rol: dto.rol ?? 'agente',
      organizacionId: dto.organizacionId,
    },
  });

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    createdAt: usuario.createdAt,
  };
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

function generarToken(
  id: string,
  organizacionId: string,
  rol: 'admin' | 'agente',
  email: string,
  nombre: string,
): string {
  return jwt.sign({ id, organizacionId, rol, email, nombre }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verificarToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
