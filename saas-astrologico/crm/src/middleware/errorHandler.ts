// ─── Middleware global de manejo de errores ───────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`${req.method} ${req.path} — ${err.message}`);

  const statusCode = err.message.includes('no encontrado') ? 404
    : err.message.includes('Ya existe') ? 409
    : err.message.includes('consentimiento') ? 403
    : 500;

  res.status(statusCode).json({
    ok: false,
    error: err.message,
  });
}
