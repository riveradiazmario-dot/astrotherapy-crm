# Agent-Browser: Guía de Implementación

**Creado:** 6 de septiembre de 2026  
**Rama:** `claude/agent-browser-vercel-search-pu3iqi`  
**Estado:** 📋 Pendiente de Implementación  

---

## 🚀 Inicio Rápido

### 1️⃣ Instalación de dependencias

```bash
# En /saas-astrologico/crm/
npm install @vercel/agent-browser puppeteer
# Alternativa: npm install @vercel/agent-browser playwright
```

### 2️⃣ Crear servicio BrowserService

Crear archivo: `src/services/browser.service.ts`

```typescript
import puppeteer, { Browser, Page } from 'puppeteer';

export class BrowserService {
  private browser: Browser | null = null;

  async launch() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Browser launched');
  }

  async scrapeInstagramProfile(url: string) {
    if (!this.browser) throw new Error('Browser not launched');
    
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Esperar elementos clave
      await page.waitForSelector('h2', { timeout: 5000 }).catch(() => null);
      
      const profile = await page.evaluate(() => {
        const nameEl = document.querySelector('h2');
        const bioEl = document.querySelector('section div span');
        const imgEl = document.querySelector('img[role="presentation"]') as HTMLImageElement;
        
        return {
          name: nameEl?.textContent?.trim(),
          bio: bioEl?.textContent?.trim(),
          avatar: imgEl?.src,
          followers: 0, // Requiere más parsing
          isVerified: !!document.querySelector('[aria-label*="Verificado"]')
        };
      });
      
      await page.close();
      return profile;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async scrape TikTokProfile(url: string) {
    if (!this.browser) throw new Error('Browser not launched');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const profile = await page.evaluate(() => {
        const titleEl = document.querySelector('h1');
        const bioEl = document.querySelector('[data-testid="bio"]');
        
        return {
          username: titleEl?.textContent?.trim(),
          bio: bioEl?.textContent?.trim(),
          verified: !!document.querySelector('[data-testid="verified-badge"]')
        };
      });
      
      await page.close();
      return profile;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }

  async closeAll() {
    if (this.browser) {
      const pages = await this.browser.pages();
      for (const page of pages) {
        await page.close();
      }
      await this.close();
    }
  }
}
```

### 3️⃣ Crear endpoint de verificación

Agregar en `src/routes/scraping.ts`:

```typescript
import { Router } from 'express';
import { BrowserService } from '../services/browser.service';

const router = Router();
const browserService = new BrowserService();

// Iniciar browser al arrancar el servidor
let browserReady = false;
browserService.launch().then(() => {
  browserReady = true;
}).catch(err => {
  console.error('❌ Error al lanzar browser:', err);
});

/**
 * POST /api/scraping/verify-profile
 * Verificar perfil en redes sociales
 */
router.post('/verify-profile', async (req, res) => {
  if (!browserReady) {
    return res.status(503).json({ 
      error: 'Browser service not ready' 
    });
  }

  try {
    const { instagramUrl, tiktokUrl } = req.body;

    if (!instagramUrl && !tiktokUrl) {
      return res.status(400).json({ 
        error: 'Se requiere instagramUrl o tiktokUrl' 
      });
    }

    let profile: any = {};

    if (instagramUrl) {
      profile.instagram = await browserService.scrapeInstagramProfile(instagramUrl);
    }

    if (tiktokUrl) {
      profile.tiktok = await browserService.scrapeTikTokProfile(tiktokUrl);
    }

    // Calcular score
    const leadScore = calculateScoreFromProfile(profile);

    res.json({
      success: true,
      profile,
      leadScore,
      recommendation: leadScore >= 70 ? 'high' : leadScore >= 50 ? 'medium' : 'low'
    });

  } catch (error: any) {
    console.error('❌ Error en verify-profile:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

/**
 * POST /api/scraping/verify-and-create-contact
 * Verificar perfil y crear contacto automáticamente
 */
router.post('/verify-and-create-contact', async (req, res) => {
  try {
    const { email, nombre, instagramUrl, tiktokUrl, ...resto } = req.body;

    if (!email || !nombre) {
      return res.status(400).json({ 
        error: 'email y nombre son requeridos' 
      });
    }

    // Verificar perfiles
    let profile: any = {};
    let leadScore = 10; // Puntos base

    if (instagramUrl) {
      profile.instagram = await browserService.scrapeInstagramProfile(instagramUrl);
      leadScore += 20;
    }

    if (tiktokUrl) {
      profile.tiktok = await browserService.scrapeTikTokProfile(tiktokUrl);
      leadScore += 15;
    }

    // Crear contacto con datos validados
    const nuevoContacto = {
      email,
      nombre,
      instagramUrl,
      tiktokUrl,
      leadScore: Math.min(100, leadScore),
      validationData: JSON.stringify(profile),
      estado: 'contactado',
      consentimientoEmail: false,
      ...resto
    };

    // TODO: Implementar con Prisma
    // const contacto = await prisma.contacto.create({ data: nuevoContacto });

    res.json({
      success: true,
      contacto: nuevoContacto,
      profile,
      leadScore: nuevoContacto.leadScore
    });

  } catch (error: any) {
    console.error('❌ Error en verify-and-create-contact:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

/**
 * Función auxiliar: calcular score a partir del perfil
 */
function calculateScoreFromProfile(profile: any): number {
  let score = 10; // Base

  if (profile.instagram?.isVerified) score += 30;
  if (profile.instagram?.followers > 1000) score += 25;
  if (profile.instagram?.followers > 5000) score += 15;
  if (profile.instagram?.bio?.length > 50) score += 10;

  if (profile.tiktok?.verified) score += 35;

  return Math.min(100, score);
}

export default router;
```

### 4️⃣ Integrar en main index.ts

```typescript
import scrapingRoutes from './routes/scraping';

// ... resto del código

app.use('/api/scraping', scrapingRoutes);
```

---

## 📋 Checklist de Implementación

### Fase 1: Setup básico
- [ ] Instalar `@vercel/agent-browser` y `puppeteer`
- [ ] Crear `BrowserService` en `src/services/`
- [ ] Crear endpoint `/api/scraping/verify-profile`
- [ ] Testear con Instagram y TikTok
- [ ] Documentar selectores CSS de cada red social

### Fase 2: Integración CRM
- [ ] Crear endpoint `/api/scraping/verify-and-create-contact`
- [ ] Enriquecer modelo `Contacto` con campo `validationData`
- [ ] Integrar scoring automático
- [ ] Actualizar documentación de API

### Fase 3: Automatización avanzada
- [ ] Implementar Cron Jobs (cada 6 horas)
- [ ] Re-validar leads de alto score
- [ ] Monitoreo de cambios en perfiles
- [ ] Alertas automáticas

---

## 🧪 Testing

### Test básico en curl

```bash
# 1. Verificar perfil
curl -X POST http://localhost:3000/api/scraping/verify-profile \
  -H "Content-Type: application/json" \
  -d '{
    "instagramUrl": "https://instagram.com/user_example/"
  }'

# Respuesta esperada:
# {
#   "success": true,
#   "profile": {
#     "instagram": { "name": "...", "bio": "...", "isVerified": true }
#   },
#   "leadScore": 75,
#   "recommendation": "high"
# }
```

### Test de carga (stress test)

```typescript
// src/test-browser-load.ts
import { BrowserService } from './services/browser.service';

async function testConcurrency() {
  const service = new BrowserService();
  await service.launch();

  const urls = [
    'https://instagram.com/astrologa1/',
    'https://instagram.com/astrologa2/',
    'https://tiktok.com/@usuario1'
  ];

  const results = await Promise.all(
    urls.map(url => 
      url.includes('instagram')
        ? service.scrapeInstagramProfile(url)
        : service.scrapeTikTokProfile(url)
    )
  );

  console.log('✅ Test completado:', results);
  await service.close();
}

testConcurrency();
```

---

## ⚙️ Optimizaciones Recomendadas

### 1. Browser Pooling (para múltiples requests)

```typescript
class BrowserPool {
  private browsers: Browser[] = [];
  private queue: (() => Promise<any>)[] = [];
  private poolSize = 3;

  async initialize() {
    for (let i = 0; i < this.poolSize; i++) {
      const browser = await puppeteer.launch();
      this.browsers.push(browser);
    }
  }

  async execute<T>(task: (browser: Browser) => Promise<T>): Promise<T> {
    if (this.browsers.length === 0) {
      throw new Error('Browser pool not initialized');
    }
    const browser = this.browsers.pop()!;
    try {
      return await task(browser);
    } finally {
      this.browsers.push(browser);
    }
  }

  async shutdown() {
    await Promise.all(this.browsers.map(b => b.close()));
  }
}
```

### 2. Caché de perfiles (para no re-scrapear)

```typescript
// En memory cache con TTL de 6 horas
const profileCache = new Map<string, { 
  data: any; 
  timestamp: number 
}>();

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas

function getFromCache(url: string) {
  const cached = profileCache.get(url);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    profileCache.delete(url);
    return null;
  }
  
  return cached.data;
}
```

### 3. Rate limiting

```typescript
import rateLimit from 'express-rate-limit';

const scrapingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 requests
  message: 'Demasiadas solicitudes, intenta después'
});

app.post('/api/scraping/verify-profile', scrapingLimiter, ...);
```

---

## 🐛 Troubleshooting

### ❌ Error: "Browser crashed"
**Solución:** Aumentar timeout y usar headless mode
```typescript
await puppeteer.launch({
  headless: true,
  args: ['--disable-dev-shm-usage', '--no-sandbox']
});
```

### ❌ Error: "Timeout esperando selector"
**Solución:** Aumentar timeout e implementar fallback
```typescript
await page.waitForSelector('h2', { timeout: 10000 })
  .catch(() => {
    console.warn('⚠️  Selector no encontrado, usando fallback');
    return null;
  });
```

### ❌ Detectado como bot (403)
**Solución:** Usar headless: false o agregar delays
```typescript
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)...');
await page.waitForTimeout(Math.random() * 3000); // Random delay
```

---

## 📚 Referencias

- [Puppeteer Docs](https://pptr.dev/)
- [Agent-Browser GitHub](https://github.com/vercel-labs/agent-browser)
- [Artículo: Browser Automation con Puppeteer](https://dev.to/)

---

## 💬 Notas Importantes

- **Respetar robots.txt** de sitios web
- **No sobrecargar** servidores con muchas requests
- **Usar delays** entre requests
- **Revisar ToS** de redes sociales antes de producción
- **Mantener** selectores CSS actualizados

---

**Siguiente paso:** Comenzar con Fase 1 (Setup básico)  
**Tiempo estimado:** 2-3 días

