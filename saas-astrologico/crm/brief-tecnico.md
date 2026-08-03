# Brief Técnico — CRM SaaS Astrológico

**Para:** Claude Code
**De:** Mavis
**Fecha:** 2026-06-18
**Ubicación del proyecto:** `/Users/prueba/Projects/LuzHolistica/saas-astrologico/crm/`

---

## Contexto

Construir un CRM minimal viable para el SaaS astrológico de Luz Holística. El CRM sirve para:
1. Almacenar datos de prospectos (astrólogos, terapeutas holísticos en LATAM)
2. Sincronizar con MailerLite para email marketing
3. Permitir segmentación por especialidad, nivel, país, score
4. Gestionar el pipeline de ventas

---

## Stack Técnico

- **Backend:** Node.js + TypeScript
- **Base de datos:** SQLite (fácil de migrar a PostgreSQL después)
- **ORM:** Prisma (recomendado para simplicidad)
- **API:** Express.js
- **Integración email:** MailerLite API
- **Frontend (mínimo):** API REST + documentación para consumo

---

## Estructura del Proyecto

```
/crm
├── prisma/
│   └── schema.prisma
├── src/
│   ├── index.ts              # Entry point
│   ├── routes/
│   │   ├── contactos.ts      # CRUD contactos
│   │   ├── scraping.ts       # Endpoints de scraping
│   │   └── mailerlite.ts    # Sincronización MailerLite
│   ├── services/
│   │   ├── contacto.service.ts
│   │   ├── scoring.service.ts
│   │   └── mailerlite.service.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Modelo de Datos (Schema Prisma)

```prisma
model Contacto {
  id              String   @id @default(uuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Contacto
  nombre          String?
  email           String   @unique
  telefono        String?
  usuarioRedes    String?

  // Perfil
  especialidadPrimaria  String   // astrologia_tropical, tarot, etc.
  especialidadSecundaria String?
  nivelExperiencia      String   // principiante, intermedio, avanzado, profesional
  formacion            String?
  certificaciones      String?

  // Ubicación
  pais        String   @default("MX")
  ciudad      String?
  zonaHoraria String?

  // Presencia digital
  instagramUrl        String?
  instagramSeguidores Int?
  tiktokUrl          String?
  tiktokSeguidores   Int?
  facebookUrl        String?
  youtubeUrl         String?
  webUrl            String?
  telegramUsername   String?

  // Scoring
  leadScore     Int      @default(0)
  estado        String   @default("prospecto") // prospecto, contactado, nurture, cualificado, cliente, no_interesado
  etiquetas     String   @default("[]") // JSON array como string
  interacciones Int      @default(0)
  ultimaInteraccion DateTime?

  // Consentimiento
  consentimientoEmail Boolean @default(false)
  fechaConsentimiento  DateTime?

  // Notas
  notas             String?
  proximosPasos     String?
  proximaAccionFecha DateTime?

  // Fuente
  fuente            String   // facebook, telegram, instagram, linkedin, directorio, manual

  // Relación con MailerLite
  mailerliteId String?
}

model Campana {
  id          String   @id @default(uuid())
  nombre      String
  tipo        String   // email, whatsapp
  estado      String   // borrador, activa, pausada, completada
  createdAt   DateTime @default(now())
  contactosIds String   // JSON array
}
```

---

## API Endpoints

### Contactos

```
GET    /api/contactos              # Listar todos (con filtros)
GET    /api/contactos/:id         # Obtener uno
POST   /api/contactos              # Crear nuevo
PUT    /api/contactos/:id         # Actualizar
DELETE /api/contactos/:id         # Eliminar
GET    /api/contactos/stats        # Estadísticas generales
```

**Filtros GET /api/contactos:**
```
?especialidad=astrologia_tropical
?nivel=avanzado
&pais=MX
&estado=nurture
&minScore=50
&page=1&limit=50
```

### Scraping

```
POST   /api/scraping/importar-csv  # Importar desde CSV
POST   /api/scraping/importar-json  # Importar datos de scraping en JSON
```

### MailerLite

```
POST   /api/mailerlite/sincronizar  # Sincronizar todos los contactos
POST   /api/mailerlite/enviar       # Enviar campaña
GET    /api/mailerlite/estadisticas # Stats de campañas
```

---

## Funcionalidades Requeridas

### 1. CRUD de Contactos ✅
- Crear, leer, actualizar, eliminar
- Validación de email
- Deduplicación por email

### 2. Sistema de Scoring ✅
Implementar lógica de scoring:
- +5 puntos por captura inicial
- +10 puntos si tiene especialidad confirmada
- +15 puntos por interacción
- +20 puntos por 5 emails abiertos
- -20 puntos por 10 emails sin abrir

### 3. Integración MailerLite ✅
- Autenticación con API key
- Crear/actualizar suscriptores
- Sincronización bidireccional
- Obtención de métricas (aperturas, clicks)

### 4. Importación desde CSV ✅
Permitir importar contactos desde CSV con mapeo de columnas.

### 5. Segmentación ✅
- Filtrar por cualquier campo
- Generar segmentos dinámicos
- Exportar a CSV para MailerLite

---

## Variables de Entorno (.env)

```env
PORT=3000
DATABASE_URL="file:./dev.db"

# MailerLite
MAILERLITE_API_KEY=your_api_key_here
MAILERLITE_GROUP_ID=your_group_id_here
```

---

## Testing

Incluir scripts de test básicos:
- Crear contacto
- Actualizar score
- Importar CSV de prueba
- Verificar sincronización con MailerLite

---

## Entregables

1. Código completo en la carpeta `/crm/`
2. `README.md` con instrucciones de setup
3. `package.json` con todos los scripts
4. Base de datos SQLite inicializada
5. Un contacto de prueba insertado

---

## Notas Importantes

- Priorizar simplicidad y funcionalidad sobre estética
- No implementar frontend complejo — API REST es suficiente para integración con herramientas externas
- Documentar bien los endpoints para uso futuro
- Seguir las mejores prácticas de TypeScript (types estrictos)

---

¡Manos a la obra, Claude!
