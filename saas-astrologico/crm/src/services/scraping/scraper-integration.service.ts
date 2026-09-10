// ─── Integración de Scrapers con CRM ──────────────────────────────────────────
// Funciones para importar datos de scrapers directamente al CRM con scoring

import { PrismaClient } from '@prisma/client';
import { crearContacto } from '../contacto.service';
import { CrearContactoDTO } from '../../types';

const prisma = new PrismaClient();

export interface LeadScrapedDelInstagram {
  username: string;
  nombre?: string;
  bio?: string;
  emailEnBio?: string;
  especialidadDetectada?: string;
  score?: any;
  fuente: 'instagram';
}

export interface LeadScrapedDelTikTok {
  username: string;
  nombreDisplay?: string;
  bio?: string;
  emailEnBio?: string;
  especialidadDetectada?: string;
  score?: any;
  fuente: 'tiktok';
}

export interface LeadScrapedDelTelegram {
  username: string;
  titulo?: string;
  especialidadDetectada?: string;
  emailsEncontrados?: string[];
  score?: any;
  fuente: 'telegram';
}

/**
 * Importar leads de Instagram al CRM con scoring automático
 */
export async function importarLeadsInstagram(
  perfiles: LeadScrapedDelInstagram[],
  organizacionId: string,
): Promise<{
  importados: number;
  duplicados: number;
  errores: number;
  detalles: string[];
}> {
  let importados = 0;
  let duplicados = 0;
  let errores = 0;
  const detalles: string[] = [];

  for (const perfil of perfiles) {
    try {
      if (!perfil.emailEnBio) {
        detalles.push(`@${perfil.username} sin email — omitido`);
        continue;
      }

      // Verificar que no sea duplicado
      const existente = await prisma.contacto.findFirst({
        where: { email: perfil.emailEnBio.toLowerCase(), organizacionId },
      });

      if (existente) {
        duplicados++;
        detalles.push(`Duplicado: @${perfil.username}`);
        continue;
      }

      // Mapear score de scraper a leadScore de CRM
      const leadScore = perfil.score?.totalScore || 25;

      // Crear DTO para CRM
      const dto: CrearContactoDTO = {
        email: perfil.emailEnBio,
        nombre: perfil.nombre || perfil.username,
        especialidadPrimaria: (perfil.especialidadDetectada as any) || 'otro',
        fuente: 'instagram',
        instagramUrl: `https://www.instagram.com/${perfil.username}/`,
        notas: perfil.bio || undefined,
        etiquetas: perfil.score ? [perfil.score.etiqueta] : [],
      };

      // Crear contacto
      const contacto = await crearContacto(dto, organizacionId);

      // Actualizar leadScore con el del scraper
      await prisma.contacto.update({
        where: { id: contacto.id },
        data: {
          leadScore,
          score: perfil.score?.totalScore || undefined,
          etiqueta: perfil.score?.etiqueta || undefined,
        },
      });

      importados++;
      detalles.push(`Importado: @${perfil.username}`);
    } catch (err) {
      errores++;
      detalles.push(`Error @${perfil.username}: ${(err as Error).message}`);
    }
  }

  return { importados, duplicados, errores, detalles };
}

/**
 * Importar leads de TikTok al CRM con scoring
 */
export async function importarLeadsTikTok(
  perfiles: LeadScrapedDelTikTok[],
  organizacionId: string,
): Promise<{
  importados: number;
  duplicados: number;
  errores: number;
  detalles: string[];
}> {
  let importados = 0;
  let duplicados = 0;
  let errores = 0;
  const detalles: string[] = [];

  for (const perfil of perfiles) {
    try {
      if (!perfil.emailEnBio) {
        detalles.push(`@${perfil.username} sin email — omitido`);
        continue;
      }

      const existente = await prisma.contacto.findFirst({
        where: { email: perfil.emailEnBio.toLowerCase(), organizacionId },
      });

      if (existente) {
        duplicados++;
        detalles.push(`Duplicado: @${perfil.username}`);
        continue;
      }

      const leadScore = perfil.score?.totalScore || 20;

      const dto: CrearContactoDTO = {
        email: perfil.emailEnBio,
        nombre: perfil.nombreDisplay || perfil.username,
        especialidadPrimaria: (perfil.especialidadDetectada as any) || 'otro',
        fuente: 'tiktok',
        notas: perfil.bio || undefined,
        etiquetas: perfil.score ? [perfil.score.etiqueta] : [],
      };

      const contacto = await crearContacto(dto, organizacionId);

      await prisma.contacto.update({
        where: { id: contacto.id },
        data: {
          leadScore,
          score: perfil.score?.totalScore || undefined,
          etiqueta: perfil.score?.etiqueta || undefined,
        },
      });

      importados++;
      detalles.push(`Importado: @${perfil.username}`);
    } catch (err) {
      errores++;
      detalles.push(`Error @${perfil.username}: ${(err as Error).message}`);
    }
  }

  return { importados, duplicados, errores, detalles };
}

/**
 * Importar leads de Telegram al CRM
 */
export async function importarLeadsTelegram(
  canales: LeadScrapedDelTelegram[],
  organizacionId: string,
): Promise<{
  importados: number;
  duplicados: number;
  errores: number;
  detalles: string[];
}> {
  let importados = 0;
  let duplicados = 0;
  let errores = 0;
  const detalles: string[] = [];

  for (const canal of canales) {
    try {
      // Telegram puede tener múltiples emails
      const emails = canal.emailsEncontrados || [];
      if (emails.length === 0) {
        detalles.push(`@${canal.username} sin emails — omitido`);
        continue;
      }

      for (const email of emails) {
        try {
          const existente = await prisma.contacto.findFirst({
            where: { email: email.toLowerCase(), organizacionId },
          });

          if (existente) {
            duplicados++;
            detalles.push(`Duplicado: ${email} (@${canal.username})`);
            continue;
          }

          const leadScore = canal.score?.scoreCalidad || 25;

          const dto: CrearContactoDTO = {
            email,
            nombre: canal.titulo || canal.username,
            especialidadPrimaria: (canal.especialidadDetectada as any) || 'otro',
            fuente: 'telegram',
            telegramUsername: canal.username,
            etiquetas: [canal.score?.calidad || 'media'],
          };

          const contacto = await crearContacto(dto, organizacionId);

          await prisma.contacto.update({
            where: { id: contacto.id },
            data: {
              leadScore,
              score: canal.score?.scoreCalidad || undefined,
              etiqueta: canal.score?.calidad || undefined,
            },
          });

          importados++;
          detalles.push(`Importado: ${email} (@${canal.username})`);
        } catch (err) {
          errores++;
          detalles.push(`Error ${email}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      errores++;
      detalles.push(`Error @${canal.username}: ${(err as Error).message}`);
    }
  }

  return { importados, duplicados, errores, detalles };
}

/**
 * Obtener estadísticas de leads por fuente y etiqueta
 */
export async function obtenerEstadisticasLeadsPorFuente(
  organizacionId: string,
): Promise<Record<string, any>> {
  const stats = await prisma.contacto.groupBy({
    by: ['fuente', 'etiqueta'],
    where: { organizacionId },
    _count: true,
    _avg: { score: true },
  });

  const resultado: Record<string, any> = {};

  for (const s of stats) {
    const fuente = s.fuente || 'unknown';
    if (!resultado[fuente]) {
      resultado[fuente] = {
        total: 0,
        porEtiqueta: {},
        scorePromedio: 0,
        totalScore: 0,
      };
    }

    resultado[fuente].total += s._count;
    resultado[fuente].porEtiqueta[s.etiqueta || 'sin_etiqueta'] = s._count;
    resultado[fuente].totalScore += (s._avg.score || 0) * s._count;
  }

  // Calcular promedios
  for (const fuente of Object.keys(resultado)) {
    resultado[fuente].scorePromedio =
      resultado[fuente].total > 0
        ? Math.round((resultado[fuente].totalScore / resultado[fuente].total) * 10) / 10
        : 0;
    delete resultado[fuente].totalScore;
  }

  return resultado;
}
