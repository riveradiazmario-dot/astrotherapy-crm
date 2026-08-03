# Arquitectura CRM — SaaS Astrológico Luz Holística

**Proyecto:** Software astrológico SaaS
**Fecha:** 2026-06-18
**Responsable:** Mavis
**Para construcción técnica:** Claude Code

---

## 1. Modelo de Datos (Campos del CRM)

### 1.1 Datos básicos de contacto

```
id: UUID (identificador único)
fecha_captura: datetime
fuente: string (facebook|telegram|instagram|linkedin|directorio|manual)
```

### 1.2 Información de contacto

```
nombre: string (opcional, puede no estar disponible en scraping)
email: string (obligatorio para email marketing)
telefono: string (opcional, para WhatsApp)
usuario_redes: string (handle de Instagram/TikTok/Telegram)
```

### 1.3 Perfil profesional

```
especialidad_primaria: enum
  - astrologia_tropical
  - astrologia_vedica
  - tarot
  - constelaciones_familiares
  - astrogenealogia
  - reiki
  - coaching_holistico
  - otro

especialidad_secundaria: enum (opcional)

nivel_experiencia: enum
  - principiante (0-2 años)
  - intermedio (2-5 años)
  - avanzado (5-10 años)
  - profesional (10+ años)

formacion: string (descripción libre)
certificaciones: string[] (opcional)
```

### 1.4 Ubicación

```
pais: string (código ISO)
ciudad: string (opcional)
estado: string (opcional, para México)
zona_horaria: string (opcional)
```

### 1.5 Presencia digital

```
instagram_url: string (opcional)
instagram_seguidores: integer (opcional)
tiktok_url: string (opcional)
tiktok_seguidores: integer (opcional)
facebook_url: string (opcional)
youtube_url: string (opcional)
web_url: string (opcional)
telegram_username: string (opcional)
```

### 1.6 Engagement y scoring

```
interacciones: integer (contador)
ultima_interaccion: datetime
lead_score: integer (0-100)
etiquetas: string[] (para segmentación)

Tags sugeridos:
  - caliente
  - frio
  - en_conversacion
  - cliente_potencial
  - afiliado_potencial
  - early_adopter
  -nolanzamiento
```

### 1.7 Estado del pipeline

```
estado: enum
  - prospecto (recién capturado)
  - contactado (primer mensaje enviado)
  - nurture (secuencia de emails)
  - cualificado (mostró interés real)
  - cliente (ya compró)
  - no_interesado

notas: text (campo libre para seguimiento)
proximos_pasos: string
proxima_accion_fecha: datetime
```

### 1.8 Consentimiento GDPR/Ley GDPR LATAM

```
consentimiento_email: boolean
fecha_consentimiento: datetime
fuente_consentimiento: string (double opt-in|formulario|whatsapp)
```

---

## 2. Fuentes de Datos y Método de Captura

### 2.1 Facebook Groups (Scraping)

**Grupos objetivo:**
- Astrólogos profesionales de México/LATAM
- Tarot y astrología en español
- Terapeutas holísticos Latinoamérica
- Comunidades de constelaciones familiares
- Grupos de formación astrológica

**Datos a capturar:**
- Nombre del miembro
- Email (si está visible en perfil)
- URL del perfil
- Fecha de unión al grupo
- Posts recientes (para identificar especialización)

**Método:** API no oficial + web scraping (Beedemo, PhantomBuster)

**Nota legal:** Explicitar que los datos se usan para comunicación comercial con opt-in posterior.

### 2.2 Grupos de Telegram

**Grupos objetivo:**
- @astrologosmx
- @tarotistaslatam
- @terapeutasholisticos
- Canales de astrólogos reconocidos

**Datos a capturar:**
- Nombre de usuario
- ID de Telegram
- Biografía del perfil
- Canales que administra

**Método:** Scraping vía Telegram Bot API (con consentimiento del grupo)

### 2.3 Instagram

**Fuentes:**
- Perfiles con bio que indique "astrólog@" / "tarotist@"
- Hashtags: #astrologiamx, #tarotmexico, #terapeutaespirital, #astrologialatina
- Cuentas que siguen a formadores de astrología en LATAM

**Datos a capturar:**
- Username
- Número de seguidores
- Bio (para identificar especialidad)
- Email (si está en bio)

**Método:** Instagram Graph API o scraping (cumpliendo términos de uso)

### 2.4 LinkedIn

**Grupos objetivo:**
- Astrólogos profesionales
- Holistic Health Professionals
- Tarot Readers Network

**Datos a capturar:**
- Nombre
- Título profesional
- Email (si premium)
- Empresa/Práctica

**Método:** LinkedIn Sales Navigator o Apollo.io (ya tienen datos)

### 2.5 Directorios especializados

**Directorios a investigar:**
- Directorio de astrólogos de ISAR (International Society for Astrological Research)
- Directorio de la Sociedad Astronómica de México
- Directorios de tarotistas en portales mexicanos
- Hotmart/Inkm\Type → instructores de astrología

### 2.6 Web scraping de perfiles públicos

**Sitios objetivo:**
- astro.com (foros de usuarios)
- tarot.com
- sitios personales de astrólogos .com.mx, .com.ar, .co

---

## 3. Arquitectura Técnica del CRM

### 3.1 Stack recomendado

```
Base de datos: SQLite (MVP) → PostgreSQL (escala)
Backend: Node.js / TypeScript
API: RESTful
Frontend: React Admin o similar (o integrarlo en Systeme.io)
```

### 3.2 Estructura del proyecto

```
/crm
├── /src
│   ├── /models
│   │   └── contacto.ts
│   ├── /services
│   │   ├── scraping/
│   │   │   ├── facebook.ts
│   │   │   ├── telegram.ts
│   │   │   ├── instagram.ts
│   │   │   └── linkedin.ts
│   │   ├── email/
│   │   │   └── mailerlite.ts
│   │   └── scoring.ts
│   ├── /routes
│   │   ├── contactos.ts
│   │   ├── campaigns.ts
│   │   └── integrations.ts
│   └── app.ts
├── /data
│   └── database.sqlite
├── package.json
└── README.md
```

### 3.3 Funcionalidades core

#### 3.3.1 Módulo de captura

- Importación desde CSV/Excel (datos manuales)
- Conexión con APIs de scraping
- Deduplicación automática (por email/teléfono)
- Normalización de datos

#### 3.3.2 Módulo de segmentación

- Filtros por: especialidad, ubicación, nivel, score, estado
- Tags personalizados
- Listas dinámicas (se actualizan en tiempo real)

#### 3.3.3 Módulo de comunicación

- Integración con MailerLite:
  - Sincronización bidireccional de contactos
  - Creación de secuencias de email
  - Activación de campañas por trigger
- Integración con WhatsApp Business API (para fase posterior)
- Integración con Telegram Bot (para fase posterior)

#### 3.3.4 Módulo de scoring

**Lead Scoring (0-100):**

| Acción | Puntos |
|--------|--------|
| Capturado vía scraping | +5 |
| Email visible en perfil | +5 |
| Especialidad confirmada | +10 |
| Interactuó con contenido | +15 |
| Abrió emails (x5) | +20 |
| Visitó landing page | +10 |
| Click en link de venta | +30 |
| Respondió mensaje | +25 |
| No abrió emails (x10) | -20 |

#### 3.3.5 Módulo de analytics

- Tasa de apertura por segmento
- Tasa de respuesta
- Pipeline funnel (prospecto → cliente)
- ROI por fuente de captura

---

## 4. Estrategia de Comercialización (Anti-Spam)

### 4.1 Principio fundamental

**Nunca enviar emails sin consentimiento activo.** La base es opt-in, no opt-out.

### 4.2 Catapulta de email (secuencia de nurture)

**Fase 1: Captura y Warm-up (Semana 1-2)**

| Día | Acción | Contenido |
|-----|--------|-----------|
| 0 | Captura | Lead entra a la lista desde landing/formulario |
| 1 | Email 1 | Bienvenida + video de introducción (sin venta) |
| 3 | Email 2 | Contenido de valor (artículo sobre el problema del terapeuta) |
| 5 | Email 3 | Case study o testimonio (social proof) |
| 7 | Email 4 | Presentación del software + video demo |
| 10 | Email 5 | Oferta de trial 7 días (CTA directo) |

**Fase 2: Sequimiento (Semana 3-4)**

| Día | Acción | Contenido |
|-----|--------|-----------|
| 14 | Email 6 | Recordatorio de trial + beneficios |
| 18 | Email 7 | Pregunta (pedir respuesta para cualificar) |
| 21 | Email 8 | Testimonio adicional o bonus |
| 25 | Email 9 | Última llamada (urgencia limitada) |
| 30 | Email 10 | Descuento por tiempo limitado (si aplica) |

**Fase 3: No-respondedores**

- Si no abrieron emails en 30 días → remover de lista activa
- Si abrieron pero no compraron → lista de retargeting (cada 60 días, contenido diferente)

### 4.3 Segmentación para envío

**Segmento A: Early Adopters (lanzamiento)**
- Tags: early_adopter, nolanzamiento
- Secuencia especial de lanzamiento
- Precio reducido ($29/mes)

**Segmento B: Astrólogos establecidos**
- Nivel: avanzado/profesional
- Focus: eficiencia y profesionalismo
- Copy: "Ahorra 2 horas por semana"

**Segmento C: Terapeutas en transición**
- Especialidad: coaching, reiki, constelaciones
- Focus: diferenciación y nuevos servicios
- Copy: "Añade astrología a tu práctica"

**Segmento D: Principiantes**
- Nivel: principiante
- Focus: aprendizaje y herramientas
- Copy: "Construye tu práctica con la mejor tecnología"

### 4.4 Email warm-up (para cuentas nuevas)

**Regla de oro:** No enviar más de 50 emails/día las primeras 2 semanas.

**Progresión:**
- Semana 1: 10 emails/día
- Semana 2: 25 emails/día
- Semana 3: 50 emails/día
- Semana 4+: 100 emails/día (límite saludable)

**Herramientas de warm-up:**
- lemwarm (Lemlist)
- Mailwarm
- Instantwárm

### 4.5 Métricas para evitar spam

**Límites seguros:**
- Tasa de apertura > 20% (indica contenido relevante)
- Tasa de unsubscribe < 0.5% (indica que no es spam)
- Tasa de complaint < 0.1% (crítico para reputación)
- Rotación de servidor de envío cada 3 meses

---

## 5. Integración con MailerLite

### 5.1 Configuración

1. Crear cuenta MailerLite
2. Configurar dominio de envío personalizado
3. Configurar SPF, DKIM, DMARC
4. Implementar double opt-in

### 5.2 Grupos en MailerLite

- [x] Astrólogos profesionales
- [x] Terapeutas holísticos
- [x] Early adopters
- [x] Clientes
- [x] No interesados (para no molestar)

### 5.3 Campos personalizados (coincidir con modelo CRM)

- `especialidad`
- `nivel_experiencia`
- `pais`
- `lead_score`
- `fuente`

---

## 6. Próximos Pasos para Claude Code

### 6.1 Tareas priorizadas

1. **Crear modelo de datos** en TypeScript ( contacto.ts)
2. **Implementar base de datos** SQLite con las tablas necesarias
3. **Construir API básica** para CRUD de contactos
4. **Integrar MailerLite** (conexión API)
5. **Implementar script de scraping** (Facebook Groups como MVP)
6. **Crear dashboard** simple para ver contactos y métricas

### 6.2 Entregables

- Código funcional en `/Users/prueba/Projects/LuzHolistica/saas-astrologico/crm/`
- Documentación de setup
- Instrucciones para запуска

---

## 7. Consideraciones Legales

- Incluir política de privacidad en todos los formularios
- Incluir link de unsubscribe en todos los emails
- Mantener registro de consentimientos
- Para México: cumplir con la LFPDPPP (Ley Federal de Protección de Datos Personales)
- Para LATAM: GDPR-like, cada país tiene sus matices
