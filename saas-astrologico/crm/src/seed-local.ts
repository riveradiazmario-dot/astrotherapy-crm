// ─── Seed local: crea organización si no existe ───────────────────────────────
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existente = await prisma.organizacion.findFirst();
  if (existente) {
    console.log(`✅ Ya existe la organización: "${existente.nombre}" (slug: ${existente.slug})`);
    console.log(`   ID: ${existente.id}`);
    return;
  }

  const org = await prisma.organizacion.create({
    data: {
      nombre: 'Luz Holística',
      slug: 'luz-holistica',
      plan: 'interno',
      activa: true,
    },
  });

  console.log(`✅ Organización creada: "${org.nombre}" (slug: ${org.slug})`);
  console.log(`   ID: ${org.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
