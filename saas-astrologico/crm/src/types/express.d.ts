// ─── Extensión del tipo Request de Express ────────────────────────────────────
// Permite usar req.usuario en todas las rutas protegidas.

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        organizacionId: string;
        rol: 'admin' | 'agente';
        email: string;
        nombre: string;
      };
    }
  }
}

export {};
