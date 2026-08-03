// ─── Seed — Datos de prueba ───────────────────────────────────────────────────
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Insertando datos de prueba...');

  const contactos = [
    {
      nombre: 'María García López',
      email: 'maria.garcia@ejemplo.com',
      telefono: '+52 55 1234 5678',
      especialidadPrimaria: 'astrologia_tropical',
      nivelExperiencia: 'avanzado',
      pais: 'MX',
      ciudad: 'Ciudad de México',
      instagramUrl: 'https://instagram.com/maria_astro',
      instagramSeguidores: 3200,
      leadScore: 45,
      estado: 'nurture',
      etiquetas: JSON.stringify(['caliente', 'early_adopter']),
      fuente: 'instagram',
      consentimientoEmail: true,
      fechaConsentimiento: new Date(),
      fuenteConsentimiento: 'formulario',
      notas: 'Muy interesada en el módulo de análisis transgeneracional',
      proximosPasos: 'Enviar demo de la función de carta natal',
    },
    {
      nombre: 'Carlos Mendoza',
      email: 'carlos.mendoza@ejemplo.com',
      especialidadPrimaria: 'tarot',
      especialidadSecundaria: 'coaching_holistico',
      nivelExperiencia: 'profesional',
      pais: 'CO',
      ciudad: 'Bogotá',
      leadScore: 72,
      estado: 'cualificado',
      etiquetas: JSON.stringify(['caliente', 'afiliado_potencial']),
      fuente: 'facebook',
      consentimientoEmail: true,
      fechaConsentimiento: new Date(),
      fuenteConsentimiento: 'double_optin',
      notas: 'Tiene una escuela de tarot en Bogotá con 80 alumnos. Potencial para licencia grupal.',
    },
    {
      nombre: 'Ana Rodríguez',
      email: 'ana.rodriguez@ejemplo.com',
      especialidadPrimaria: 'constelaciones_familiares',
      nivelExperiencia: 'intermedio',
      pais: 'AR',
      ciudad: 'Buenos Aires',
      leadScore: 20,
      estado: 'prospecto',
      etiquetas: JSON.stringify(['frio']),
      fuente: 'telegram',
      consentimientoEmail: false,
    },
    {
      nombre: 'Lucía Fernández',
      email: 'lucia.fernandez@ejemplo.com',
      especialidadPrimaria: 'astrologia_vedica',
      nivelExperiencia: 'avanzado',
      pais: 'ES',
      ciudad: 'Madrid',
      instagramUrl: 'https://instagram.com/lucia_jyotish',
      instagramSeguidores: 12000,
      leadScore: 85,
      estado: 'cualificado',
      etiquetas: JSON.stringify(['caliente', 'early_adopter']),
      fuente: 'instagram',
      consentimientoEmail: true,
      fechaConsentimiento: new Date(),
      fuenteConsentimiento: 'formulario',
      notas: 'Influencer de astrología védica. Interesada en plan premium.',
    },
    {
      nombre: 'Roberto Silva',
      email: 'roberto.silva@ejemplo.com',
      especialidadPrimaria: 'numerologia',
      nivelExperiencia: 'principiante',
      pais: 'MX',
      ciudad: 'Guadalajara',
      leadScore: 10,
      estado: 'prospecto',
      etiquetas: JSON.stringify(['frio']),
      fuente: 'manual',
      consentimientoEmail: true,
      fechaConsentimiento: new Date(),
      fuenteConsentimiento: 'formulario',
    },
  ];

  let creados = 0;
  for (const c of contactos) {
    try {
      await prisma.contacto.upsert({
        where: { email: c.email },
        update: c,
        create: c,
      });
      creados++;
      console.log(`  ✅ ${c.nombre} (${c.email})`);
    } catch (err) {
      console.log(`  ⚠️  Ya existe: ${c.email}`);
    }
  }

  const total = await prisma.contacto.count();
  console.log(`\n✨ Seed completado. ${creados} contactos insertados. Total en BD: ${total}`);
  console.log(`\n👉 Levanta el servidor con: npm run dev`);
  console.log(`   Luego visita: http://localhost:3000/`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
