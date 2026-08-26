/* ══════════════════════════════════════════════════════
   Luz Holística — JavaScript compartido
   ══════════════════════════════════════════════════════ */

const SUPABASE_URL  = 'https://vfqaxzgyasbpfdrnfpuj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcWF4emd5YXNicGZkcm5mcHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMzk1MTUsImV4cCI6MjA5NjcxNTUxNX0.JOhqB-ADS1rwR5HFx4TTZO-PuL-E13XvsP9HkMu57vA';
const WA_NUMBER     = '525556518415';
const WA_BASE       = `https://wa.me/${WA_NUMBER}`;

// ══════════════════════════════════════════════════════
//  FONDO CÓSMICO ANIMADO
//  Estrellas titilantes + planetas flotantes + carta astral giratoria
// ══════════════════════════════════════════════════════
(function initCosmicBackground() {
  const canvas = document.createElement('canvas');
  canvas.id = 'cosmic-canvas';
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', zIndex: '0',
    pointerEvents: 'none', width: '100%', height: '100%',
  });
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Estrellas ──
  const NUM_STARS = 180;
  const stars = Array.from({ length: NUM_STARS }, () => ({
    x:     Math.random(),
    y:     Math.random(),
    r:     Math.random() * 1.4 + 0.3,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.6 + 0.2,   // ciclos por segundo
    gold:  Math.random() < 0.25,          // 25% son doradas
  }));

  // ── Planetas / símbolos astrológicos ──
  const PLANET_SYMBOLS = ['☽','☿','♀','☉','♂','♃','♄','♅','♆','⊕'];
  const planets = PLANET_SYMBOLS.map(() => ({
    x:  Math.random(),
    y:  Math.random(),
    vx: (Math.random() - 0.5) * 0.00008,
    vy: (Math.random() - 0.5) * 0.00008,
    size:    Math.random() * 18 + 14,
    opacity: Math.random() * 0.12 + 0.04,
    symbol:  PLANET_SYMBOLS[Math.floor(Math.random() * PLANET_SYMBOLS.length)],
  }));

  // ── Carta astral (rueda zodiacal) ──
  const ZODIAC = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  let wheelAngle = 0;
  const WHEEL_OPACITY = 0.055;

  function drawWheel(cx, cy, R) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(wheelAngle);
    ctx.globalAlpha = WHEEL_OPACITY;
    ctx.strokeStyle = '#d4a373';
    ctx.fillStyle   = '#f0c987';
    ctx.lineWidth   = 0.8;

    // Círculo exterior
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    // Círculo interior
    ctx.beginPath(); ctx.arc(0, 0, R * 0.68, 0, Math.PI * 2); ctx.stroke();
    // Círculo central
    ctx.beginPath(); ctx.arc(0, 0, R * 0.25, 0, Math.PI * 2); ctx.stroke();

    // 12 radios (casas)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25);
      ctx.lineTo(Math.cos(a) * R,        Math.sin(a) * R);
      ctx.stroke();
    }

    // Símbolos zodiacales en el anillo exterior
    ctx.font = `${R * 0.13}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symR = R * 0.845;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2 + (Math.PI / 12);
      ctx.save();
      ctx.translate(Math.cos(a) * symR, Math.sin(a) * symR);
      ctx.rotate(-wheelAngle); // Contra-rotamos para que los símbolos queden derechos
      ctx.fillText(ZODIAC[i], 0, 0);
      ctx.restore();
    }

    // Cruz central
    ctx.beginPath();
    ctx.moveTo(-R * 0.22, 0); ctx.lineTo(R * 0.22, 0);
    ctx.moveTo(0, -R * 0.22); ctx.lineTo(0, R * 0.22);
    ctx.stroke();

    ctx.restore();
  }

  // ── Loop de animación ──
  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t = time / 1000;

    // Estrellas
    stars.forEach(s => {
      const blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed * Math.PI * 2 + s.phase));
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.gold
        ? `rgba(240, 201, 135, ${blink})`
        : `rgba(255, 255, 255, ${blink * 0.85})`;
      ctx.fill();
    });

    // Planetas
    planets.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -0.05) p.x = 1.05;
      if (p.x >  1.05) p.x = -0.05;
      if (p.y < -0.05) p.y = 1.05;
      if (p.y >  1.05) p.y = -0.05;
      ctx.font = `${p.size}px 'Cormorant Garamond', serif`;
      ctx.fillStyle = `rgba(212, 163, 115, ${p.opacity})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.symbol, p.x * canvas.width, p.y * canvas.height);
    });

    // Carta astral — posicionada en la parte derecha del hero
    const R = Math.min(canvas.width, canvas.height) * 0.2;
    const cx = canvas.width  * 0.83;
    const cy = canvas.height * 0.42;
    wheelAngle += 0.00015;
    drawWheel(cx, cy, R);

    // Segunda carta más pequeña en la esquina inferior izquierda
    const R2 = R * 0.55;
    const cx2 = canvas.width  * 0.08;
    const cy2 = canvas.height * 0.80;
    ctx.save();
    ctx.globalAlpha = 0.035;
    drawWheel(cx2, cy2, R2);
    ctx.restore();

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();

// ── Hamburger menu + Atribución ──
document.addEventListener('DOMContentLoaded', () => {
  // Capturar atribución
  captureAttribution()

  // Crear lead_id
  getOrCreateLeadId()

  // Agregar lead_id a Stripe links
  attachLeadIdToStripeLinks()

  const burger = document.querySelector('.hamburger')
  const nav    = document.querySelector('.site-nav')
  if (burger && nav) {
    burger.addEventListener('click', () => nav.classList.toggle('open'))
  }

  // Marcar enlace activo
  const links = document.querySelectorAll('.site-nav a')
  links.forEach(a => {
    if (a.href === location.href || location.pathname.startsWith(new URL(a.href).pathname) && new URL(a.href).pathname !== '/') {
      a.classList.add('active')
    }
  })
})

// ═════════════════════════════════════════════════════════
// ATRIBUCIÓN — UTILITIES
// ═════════════════════════════════════════════════════════

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function setCookie(name, value, days = 365) {
  const date = new Date()
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
  document.cookie = `${name}=${value}; path=/; expires=${date.toUTCString()}`
}

function getCookie(name) {
  const cookies = document.cookie.split(';')
  for (let c of cookies) {
    const [n, v] = c.split('=')
    if (n.trim() === name) return v?.trim()
  }
  return null
}

// ═════════════════════════════════════════════════════════
// CAPTURAR ATRIBUCIÓN EN PRIMERA VISITA
// ═════════════════════════════════════════════════════════

function captureAttribution() {
  const params = new URLSearchParams(window.location.search)
  const now = new Date().toISOString()

  if (!localStorage.getItem('first_touch')) {
    const first_touch = {
      ts: now,
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
      referrer: document.referrer || 'direct',
      landing: window.location.pathname,
    }
    localStorage.setItem('first_touch', JSON.stringify(first_touch))
  }

  const last_touch = {
    ts: now,
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    page: window.location.pathname,
  }
  localStorage.setItem('last_touch', JSON.stringify(last_touch))

  const gclid = params.get('gclid')
  if (gclid) {
    localStorage.setItem('gclid', gclid)
    localStorage.setItem('gclid_ts', Date.now().toString())
  }

  const fbclid = params.get('fbclid')
  if (fbclid) {
    localStorage.setItem('fbclid', fbclid)
  }
}

// ═════════════════════════════════════════════════════════
// OBTENER O CREAR LEAD_ID
// ═════════════════════════════════════════════════════════

function getOrCreateLeadId() {
  let lead_id = localStorage.getItem('lead_id')
  if (!lead_id) {
    lead_id = generateUUID()
    localStorage.setItem('lead_id', lead_id)
    setCookie('lead_id', lead_id)
  }
  return lead_id
}

// ═════════════════════════════════════════════════════════
// OBTENER GA4 CLIENT_ID
// ═════════════════════════════════════════════════════════

function getGAClientId() {
  const cookies = document.cookie.split(';')
  for (let cookie of cookies) {
    if (cookie.trim().startsWith('_ga=')) {
      return cookie.split('=')[1]
    }
  }
  return localStorage.getItem('ga_client_id') || null
}

// ═════════════════════════════════════════════════════════
// COMPILAR ATRIBUCIÓN JSON
// ═════════════════════════════════════════════════════════

function getAttribution() {
  const lead_id = getOrCreateLeadId()
  const ga_client_id = getGAClientId()
  const first_touch = JSON.parse(localStorage.getItem('first_touch') || '{}')
  const last_touch = JSON.parse(localStorage.getItem('last_touch') || '{}')

  const gclid = localStorage.getItem('gclid')
  const gclid_ts = localStorage.getItem('gclid_ts')
  const isGclidValid = gclid && gclid_ts && (Date.now() - parseInt(gclid_ts) < 24 * 60 * 60 * 1000)

  const fbclid = localStorage.getItem('fbclid')

  return {
    lead_id,
    ga_client_id,
    first_touch: Object.keys(first_touch).length > 0 ? first_touch : null,
    last_touch: Object.keys(last_touch).length > 0 ? last_touch : null,
    clicks: {
      gclid: isGclidValid ? gclid : null,
      fbclid: fbclid,
    },
  }
}

// ── Lead capture form ──
async function submitLead(formEl, origen) {
  const msg = formEl.querySelector('.form-msg')
  const btn = formEl.querySelector('[type="submit"]')

  const data = {
    nombre:      formEl.querySelector('[name="nombre"]')?.value?.trim()   || '',
    email:       formEl.querySelector('[name="email"]')?.value?.trim()    || '',
    telefono:    formEl.querySelector('[name="telefono"]')?.value?.trim() || '',
    interes:     formEl.querySelector('[name="interes"]')?.value          || '',
    mensaje:     formEl.querySelector('[name="mensaje"]')?.value?.trim()  || '',
    origen:      origen || document.title,
    attribution: getAttribution(),
  }

  if (!data.nombre || !data.email) {
    if (msg) { msg.textContent = 'Por favor completa nombre y correo.'; msg.className = 'form-msg err' }
    return
  }

  btn.disabled = true
  btn.textContent = 'Enviando…'

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'apikey':        SUPABASE_ANON,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      // DataLayer: generate_lead
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'generate_lead',
          lead_type: data.interes || 'general',
          email: data.email
        })
      }

      if (msg) { msg.textContent = '✦ Recibido. Te contactamos pronto.'; msg.className = 'form-msg ok' }
      formEl.reset()
    } else {
      throw new Error(`Status ${res.status}`)
    }
  } catch (e) {
    if (msg) { msg.textContent = 'Hubo un problema. Escríbenos por WhatsApp.'; msg.className = 'form-msg err' }
    console.error('Lead form error:', e)
  } finally {
    btn.disabled = false
    btn.textContent = 'Enviar mensaje'
  }
}

// ═════════════════════════════════════════════════════════
// AGREGAR LEAD_ID A STRIPE URLS (CON FALLBACK SEGURO)
// ═════════════════════════════════════════════════════════

function attachLeadIdToStripeLinks() {
  document.addEventListener('click', (e) => {
    try {
      const link = e.target.closest('a')
      if (link && link.href && link.href.includes('buy.stripe.com')) {
        e.preventDefault()

        // DataLayer: begin_checkout
        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'begin_checkout',
            item_name: link.textContent?.trim() || 'Stripe Purchase',
            item_category: 'servicios',
            link_url: link.href
          })
        }

        try {
          const lead_id = getOrCreateLeadId()
          const url = new URL(link.href)
          url.searchParams.set('client_reference_id', lead_id)
          window.open(url.toString(), link.target || '_blank')
        } catch (attrErr) {
          // Si falla agregar atribución, abrir sin ella (fallback seguro)
          console.warn('Could not attach lead_id to Stripe link, opening without it:', attrErr)
          window.open(link.href, link.target || '_blank')
        }
      }
    } catch (err) {
      // Error crítico: dejar que el click se propague normalmente
      console.error('Error in Stripe link handler:', err)
    }
  })
}

// ── WhatsApp helper ──
function openWA(msg) {
  const text = msg || '¡Hola! Me interesa conocer más sobre sus servicios.'
  window.open(`${WA_BASE}?text=${encodeURIComponent(text)}`, '_blank')
}
