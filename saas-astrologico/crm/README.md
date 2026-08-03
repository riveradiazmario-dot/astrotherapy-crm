# CRM — Luz Holística / AstroTherapy Pro

CRM minimal viable para la gestión de prospectos del SaaS astrológico.  
Stack: **Node.js + TypeScript + Prisma + SQLite + Express + MailerLite**.

---

## Setup rápido (primera vez)

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env
# → Edita .env y pon tu MAILERLITE_API_KEY

# 3. Crear la base de datos y tablas
npm run db:push

# 4. Insertar datos de prueba
npm run seed

# 5. Arrancar el servidor en modo desarrollo
npm run dev
```

El servidor arranca en **http://localhost:3000**

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con hot-reload |
| `npm run build` | Compilar a JavaScript |
| `npm start` | Ejecutar build compilado |
| `npm run db:push` | Crear/actualizar tablas en SQLite |
| `npm run db:studio` | Abrir Prisma Studio (UI visual de la BD) |
| `npm run seed` | Insertar contactos de prueba |

---

## Endpoints de la API

### Contactos

```
GET    /api/contactos                       Listar contactos (con filtros)
GET    /api/contactos/stats                 Estadísticas generales
GET    /api/contactos/segmento/:nombre      Segmento predefinido
GET    /api/contactos/:id                   Obtener un contacto
POST   /api/contactos                       Crear contacto
PUT    /api/contactos/:id                   Actualizar contacto
DELETE /api/contactos/:id                   Eliminar contacto
POST   /api/contactos/:id/accion            Registrar acción (actualiza score)
```

**Filtros disponibles para GET /api/contactos:**
```
?especialidad=astrologia_tropical
?nivel=avanzado
?pais=MX
?estado=nurture
?minScore=50
?etiqueta=caliente
?conConsentimiento=true
?page=1&limit=50
?ordenarPor=leadScore&orden=desc
```

**Segmentos predefinidos:**
- `early_adopters` — con etiqueta early_adopter y consentimiento
- `calientes` — score ≥ 70, con consentimiento, no clientes
- `astrologos_establecidos` — nivel avanzado/profesional, con consentimiento
- `sin_contactar` — prospectos sin ninguna interacción
- `clientes` — estado cliente

### Scraping / Importación

```
POST   /api/scraping/importar-csv           Subir archivo CSV (campo: "archivo")
POST   /api/scraping/importar-json          Importar JSON { contactos: [...] }
GET    /api/scraping/plantilla-csv          Descargar plantilla CSV
```

**Columnas del CSV:**
```
email, nombre, telefono, especialidad, nivel, pais, ciudad,
fuente, instagramUrl, etiquetas (separadas por |), notas
```

### MailerLite

```
POST   /api/mailerlite/sincronizar          Sincronizar todos (con consentimiento)
POST   /api/mailerlite/sincronizar/:id      Sincronizar uno
GET    /api/mailerlite/estadisticas         Stats de campañas
GET    /api/mailerlite/grupos               Listar grupos
```

---

## Ejemplos de uso con curl

```bash
# Crear un contacto
curl -X POST http://localhost:3000/api/contactos \
  -H "Content-Type: application/json" \
  -d '{
    "email": "astrologa@ejemplo.com",
    "nombre": "Sofía Torres",
    "especialidadPrimaria": "astrologia_tropical",
    "nivelExperiencia": "avanzado",
    "pais": "MX",
    "consentimientoEmail": true,
    "fuente": "instagram",
    "etiquetas": ["early_adopter"]
  }'

# Listar contactos calientes de México
curl "http://localhost:3000/api/contactos?pais=MX&minScore=60&conConsentimiento=true"

# Registrar que un contacto abrió un email
curl -X POST http://localhost:3000/api/contactos/ID_AQUI/accion \
  -H "Content-Type: application/json" \
  -d '{"tipo": "email_abierto", "descripcion": "Email de bienvenida"}'

# Importar CSV
curl -X POST http://localhost:3000/api/scraping/importar-csv \
  -F "archivo=@/ruta/a/contactos.csv"

# Ver estadísticas
curl http://localhost:3000/api/contactos/stats

# Sincronizar con MailerLite
curl -X POST http://localhost:3000/api/mailerlite/sincronizar
```

---

## Modelo de datos (campos principales)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| email | String (único) | Identificador principal |
| especialidadPrimaria | Enum | astrologia_tropical, tarot, etc. |
| nivelExperiencia | Enum | principiante, intermedio, avanzado, profesional |
| leadScore | Int (0-100) | Score automático según acciones |
| estado | Enum | prospecto → contactado → nurture → cualificado → cliente |
| etiquetas | JSON array | Tags personalizados (caliente, early_adopter, etc.) |
| fuente | String | facebook, instagram, telegram, manual, etc. |
| consentimientoEmail | Boolean | OBLIGATORIO para sincronizar con MailerLite |

---

## Lead Scoring

| Acción | Puntos |
|--------|--------|
| Captura inicial | +5 |
| Email en perfil | +5 |
| Especialidad confirmada | +10 |
| Interacción genérica | +15 |
| Cada 5 emails abiertos | +20 |
| Visita a landing page | +10 |
| Click en enlace de venta | +30 |
| Respuesta recibida | +25 |
| Trial iniciado | +40 |
| Compra realizada | +100 |
| 10 emails sin abrir | -20 |

---

## Variables de entorno (.env)

```env
PORT=3000
DATABASE_URL="file:./dev.db"
MAILERLITE_API_KEY=tu_api_key_aqui
MAILERLITE_GROUP_ASTROLOGOS=id_grupo
MAILERLITE_GROUP_TERAPEUTAS=id_grupo
MAILERLITE_GROUP_EARLY_ADOPTERS=id_grupo
MAILERLITE_GROUP_CLIENTES=id_grupo
```

---

## Próximos pasos / Roadmap

- [ ] Autenticación con JWT para proteger la API
- [ ] Webhook receiver para recibir eventos de MailerLite (aperturas, clics)
- [ ] Dashboard frontend (React Admin o similar)
- [ ] Integración con WhatsApp Business API
- [ ] Exportación a CSV con filtros aplicados
- [ ] Integración con Calendly para registrar reuniones
