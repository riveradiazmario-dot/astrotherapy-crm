# Stripe Products & Price IDs — Luz Holística
> Creados: 8 julio 2026 | Cuenta: acct_1TMh0kAlk7lN6BS3 | Moneda: MXN

## Consultas (pago único → Calendly → Stripe)

| Servicio | MXN | product_id | price_id |
|----------|-----|------------|----------|
| Diagnóstico Astrológico Terapéutico | $1,800 | prod_Uqr3uMLX6qQFbQ | price_1Tr9LaAlk7lN6BS30kCJiB6J |
| BioAstrogenealogía Sistémica | $2,800 | prod_Uqr3buPSQnJHqq | price_1Tr9LaAlk7lN6BS3J3GEb5mw |
| Revolución Solar Terapéutica | $1,200 | prod_Uqr36LncIw5Kx1 | price_1Tr9LaAlk7lN6BS3B40DTLPq |
| Constelaciones Familiares Individuales | $1,500 | prod_Uqr34ezFrJnQmu | price_1Tr9LbAlk7lN6BS3YRb4dBXc |
| Tarot Terapéutico | $800 | prod_Uqr3jzMVIt40iU | price_1Tr9LbAlk7lN6BS3K0xlr4t3 |
| Tarot Evolutivo e Integración Emocional | $1,200 | prod_Uqr3AFlXEd2foI | price_1Tr9LcAlk7lN6BS3YZmMd3Uj |

## Programas Intensivos (pago único → Calendly o directo)

| Servicio | MXN | product_id | price_id |
|----------|-----|------------|----------|
| Terapia Integral de Transformación | $5,500 | prod_Uqr3NmNCmtC2hV | price_1Tr9LcAlk7lN6BS3qxlG98hy |
| Programa de Biodescodificación de Salud | $6,500 | prod_Uqr3U0BYMkkMgC | price_1Tr9LcAlk7lN6BS3teUOAJdR |

## Formación (pago único → directo Stripe)

| Servicio | MXN | product_id | price_id |
|----------|-----|------------|----------|
| Programa Profesional Astrología + Tarot | $11,900 | prod_Uqr34Ynn8dp3wQ | price_1Tr9LdAlk7lN6BS3dsOCXj68 |
| Curso Astrología Terapéutica | $2,500 | prod_Uqr3aM8lkzOgTe | price_1Tr9LdAlk7lN6BS37dxNCf0C |
| Curso Tarot Terapéutico | $1,200 | prod_Uqr3GeAhY4zm72 | price_1Tr9LeAlk7lN6BS3dXswCUYl |
| Curso Astrogenealogía Sistémica | $3,500 | prod_Uqr3YffmZa1CW7 | price_1Tr9LeAlk7lN6BS3pUsT6UuA |

## Membresías (recurrente mensual → directo Stripe)

| Plan | MXN/mes | product_id | price_id |
|------|---------|------------|----------|
| Círculo Evolución Consciente — Fundador | $297 | prod_Uqr3VPFAxPY6qr | price_1Tr9LeAlk7lN6BS3rX9ohk2S |
| Círculo Evolución Consciente — Premium | $497 | prod_Uqr3G083wRILlQ | price_1Tr9LfAlk7lN6BS3shiinx5E |

---

## Calendly → Stripe: Links y configuración pendiente

### URLs de Calendly creadas (ligar a Stripe desde el Dashboard de Calendly)

| Evento Calendly | Calendly URL | price_id Stripe a ligar |
|-----------------|-------------|------------------------|
| Diagnóstico Astrológico Terapéutico | https://calendly.com/bioastrologia/diagnostico-astrologico-terapeutico | price_1Tr9LaAlk7lN6BS30kCJiB6J |
| BioAstrogenealogía Sistémica | https://calendly.com/bioastrologia/bioastrogenealogia-sistemica | price_1Tr9LaAlk7lN6BS3J3GEb5mw |
| Revolución Solar Terapéutica | https://calendly.com/bioastrologia/revolucion-solar-terapeutica | price_1Tr9LaAlk7lN6BS3B40DTLPq |
| Constelaciones Familiares Individuales | https://calendly.com/bioastrologia/constelaciones-familiares-individuales | price_1Tr9LbAlk7lN6BS3YRb4dBXc |
| Tarot Terapéutico | https://calendly.com/bioastrologia/tarot-terapeutico | price_1Tr9LbAlk7lN6BS3K0xlr4t3 |
| Tarot Evolutivo e Integración Emocional | https://calendly.com/bioastrologia/tarot-evolutivo-e-integracion-emocional | price_1Tr9LcAlk7lN6BS3YZmMd3Uj |
| Terapia Integral de Transformación — Primera Sesión | https://calendly.com/bioastrologia/terapia-integral-de-transformacion-primera-sesion | price_1Tr9LcAlk7lN6BS3qxlG98hy |
| Programa Biodescodificación de Salud — Primera Sesión | https://calendly.com/bioastrologia/programa-biodescodificacion-de-salud-primera-sesion | price_1Tr9LcAlk7lN6BS3teUOAJdR |

### Cómo ligar Stripe a cada evento en Calendly (hacer 1 vez por evento)
1. Ir a https://calendly.com/event_types (lista de eventos)
2. Editar el evento → sección **"Payments"**
3. Conectar Stripe → seleccionar el precio con el `price_id` de la tabla
4. Guardar

### Formación y membresías (pago directo Stripe — sin Calendly)
Generar Payment Links en Stripe Dashboard → Products → [producto] → Create payment link

| Servicio | price_id |
|----------|----------|
| Programa Profesional Astrología + Tarot | price_1Tr9LdAlk7lN6BS3dsOCXj68 |
| Curso Astrología Terapéutica | price_1Tr9LdAlk7lN6BS37dxNCf0C |
| Curso Tarot Terapéutico | price_1Tr9LeAlk7lN6BS3dXswCUYl |
| Curso Astrogenealogía Sistémica | price_1Tr9LeAlk7lN6BS3pUsT6UuA |
| Círculo Evolución Consciente — Fundador ($297/mes) | price_1Tr9LeAlk7lN6BS3rX9ohk2S |
| Círculo Evolución Consciente — Premium ($497/mes) | price_1Tr9LfAlk7lN6BS3shiinx5E |

### AstroTherapy Pro
Flujo independiente vía Supabase + Stripe (ya configurado)

### Nota: eliminar función temporal
En Supabase Dashboard → Edge Functions → eliminar `temp-create-products`
