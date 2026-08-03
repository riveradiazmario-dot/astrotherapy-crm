// ─── Test de conexión con Apify ───────────────────────────────────────────────
// Ejecutar con: npx ts-node src/test-apify.ts
import 'dotenv/config';
import axios from 'axios';

const TOKEN = process.env.APIFY_TOKEN;

async function testApify() {
  if (!TOKEN) {
    console.error('❌ No hay APIFY_TOKEN en el .env');
    process.exit(1);
  }

  console.log(`🔑 Token encontrado: ${TOKEN.substring(0, 8)}...`);

  try {
    // 1. Verificar que el token es válido consultando el perfil de usuario
    const res = await axios.get('https://api.apify.com/v2/users/me', {
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeout: 10000,
    });

    const user = res.data.data;
    console.log(`\n✅ Conexión exitosa con Apify`);
    console.log(`   Usuario: ${user.username}`);
    console.log(`   Email:   ${user.email}`);
    console.log(`   Plan:    ${user.plan?.id || 'free'}`);

    // 2. Verificar crédito disponible
    const limits = user.limits;
    if (limits) {
      console.log(`   Créditos usados este mes: $${limits.monthlyUsageUsd?.toFixed(2) || '0.00'}`);
    }

    // 3. Verificar que el actor de TikTok existe
    console.log(`\n🎵 Verificando actor TikTok Search Scraper...`);
    const actorRes = await axios.get('https://api.apify.com/v2/acts/clockworks~tiktok-scraper', {
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeout: 10000,
    });
    console.log(`✅ Actor TikTok disponible: ${actorRes.data.data?.name}`);

  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401) {
        console.error('\n❌ Token inválido o expirado.');
        console.error('   → Ve a https://console.apify.com/account/integrations y copia el token API.');
      } else if (err.response?.status === 404) {
        console.error('\n⚠️  Token válido pero actor no encontrado (puede requerir suscripción).');
      } else {
        console.error(`\n❌ Error HTTP ${err.response?.status}: ${err.response?.data?.error?.message}`);
      }
    } else {
      console.error('\n❌ Error de red:', (err as Error).message);
    }
    process.exit(1);
  }
}

testApify();
