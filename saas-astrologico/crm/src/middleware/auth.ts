// ─── Middleware de autenticación JWT ─────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verificarToken } from '../services/auth.service';

const prisma = new PrismaClient();
const LOCAL_DEV = process.env.LOCAL_DEV === 'true';

// En modo local guardamos el organizacionId en caché para no consultar la BD en cada request
let _localOrgId: string | null = null;

async function getLocalOrgId(): Promise<string | null> {
  if (_localOrgId) return _localOrgId;
  const org = await prisma.organizacion.findFirst({ orderBy: { createdAt: 'asc' } });
  if (org) { _localOrgId = org.id; return org.id; }
  return null;
}

/**
 * requireAuth — protege rutas que necesitan sesión activa.
 *
 * En LOCAL_DEV=true: bypass automático — usa la primera organización de la BD.
 * En producción: valida JWT Bearer token.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (LOCAL_DEV) {
    // Modo local: inyectar usuario de desarrollo automáticamente
    getLocalOrgId().then(orgId => {
      if (!orgId) {
        res.status(500).json({
          ok: false,
          error: 'Modo local: no hay ninguna organización en la BD. Ejecuta el seed.',
        });
        return;
      }
      req.usuario = {
        id: 'local-dev-user',
        organizacionId: orgId,
        rol: 'admin',
        email: 'dev@local',
        nombre: 'Usuario Local',
      };
      next();
    }).catch(() => {
      res.status(500).json({ ok: false, error: 'Error al obtener organización local' });
    });
    return;
  }

  // Modo producción: validar JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: 'No autenticado. Inicia sesión primero.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verificarToken(token);
    req.usuario = {
      id: payload.id,
      organizacionId: payload.organizacionId,
      rol: payload.rol,
      email: payload.email,
      nombre: payload.nombre,
    };
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' });
  }
}

/**
 * requireAdmin — solo permite acceso a usuarios con rol "admin".
 * En LOCAL_DEV siempre pasa (el usuario local es admin).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (LOCAL_DEV) { next(); return; }
  if (!req.usuario || req.usuario.rol !== 'admin') {
    res.status(403).json({ ok: false, error: 'Acción restringida a administradores.' });
    return;
  }
  next();
}
