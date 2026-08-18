// CONFIG — Curso Tarot Básico
// Todas las variables están centralizadas aquí para fácil mantenimiento

const CONFIG = {
  // ════════════════════════════════════════════
  // INFORMACIÓN DEL CURSO
  // ════════════════════════════════════════════
  course: {
    name: 'Curso de Tarot Básico',
    concept: 'Aprende a interpretar el Tarot y descubre el lenguaje de sus símbolos.',
    startDate: 'Agosto 29, 2026', // 29 de agosto de 2026
    startTime: '5:00 PM', // 5:00 PM (zona México)
    timeZone: 'América/México_City',
    sessions: 8,
    dayOfWeek: 'Sábados',
    durationPerSession: '2 horas',
    modality: '100% en línea',
    level: 'Desde cero',
    content: '22 Arcanos Mayores',
    materials: 'Incluido',
    recordings: 'Incluidas',
    diploma: 'Diploma de participación'
  },

  // ════════════════════════════════════════════
  // FECHAS ESPECÍFICAS DE SESIONES
  // ════════════════════════════════════════════
  sessions: [
    { num: 1, date: 'Agosto 29, 2026', content: '[A COMPLETAR]' },
    { num: 2, date: 'Septiembre 5, 2026', content: '[A COMPLETAR]' },
    { num: 3, date: 'Septiembre 12, 2026', content: '[A COMPLETAR]' },
    { num: 4, date: 'Septiembre 19, 2026', content: '[A COMPLETAR]' },
    { num: 5, date: 'Septiembre 26, 2026', content: '[A COMPLETAR]' },
    { num: 6, date: 'Octubre 3, 2026', content: '[A COMPLETAR]' },
    { num: 7, date: 'Octubre 10, 2026', content: '[A COMPLETAR]' },
    { num: 8, date: 'Octubre 17, 2026', content: '[A COMPLETAR]' }
  ],

  // ════════════════════════════════════════════
  // STRIPE
  // ════════════════════════════════════════════
  stripe: {
    // PENDIENTE: Crear producto en Stripe
    // El "Curso de Tarot Básico de 8 sesiones" NO existe aún
    paymentUrl: 'PAYMENT_URL_PENDING', // Variable a completar
    productId: 'prod_PENDING', // A determinar cuando se cree el producto
    priceId: 'price_PENDING', // A determinar cuando se cree el producto
    currency: 'MXN',
    price: null // A determinar
  },

  // ════════════════════════════════════════════
  // INSTRUCTOR
  // ════════════════════════════════════════════
  instructor: {
    name: 'Mario Rivera',
    title: 'Tarotista y astrólogo',
    subtitle: 'Especializado en interpretación simbólica y procesos de transformación personal',
    experience: {
      teaching: '30+ años como docente',
      totalClients: '500+ personas atendidas',
      tarotAstrology: '100+ personas en consultas y sesiones de Tarot y Astrología',
      tarotStudy: 'Aproximadamente 5 años de práctica y estudio del Tarot',
      astrologyStudy: 'Aproximadamente 4 años de estudio de Astrología'
    },
    credentials: 'Certificado por CONOCER para la impartición de cursos en línea',
    influence: 'Su trabajo incorpora elementos de la Psicología Astrológica de Bruno y Louise Huber',
    creator: 'Creador de AstroTherapy Pro',
    photo: '../../../assets/img/mario.png'
  },

  // ════════════════════════════════════════════
  // CONTACTO
  // ════════════════════════════════════════════
  contact: {
    whatsapp: '+52 555 651 8415',
    whatsappUrl: 'https://wa.me/525556518415',
    email: 'contacto@luzholistica.com.mx',
    businessHours: 'Lunes-Viernes, 10:00 AM - 7:00 PM (Zona México)',
    responseTime: '24 horas en días hábiles'
  },

  // ════════════════════════════════════════════
  // REDES SOCIALES
  // ════════════════════════════════════════════
  social: {
    instagram: 'https://instagram.com', // PENDIENTE: URL oficial
    facebook: 'https://facebook.com', // PENDIENTE: URL oficial
    tiktok: 'https://tiktok.com/@', // PENDIENTE: URL oficial
    youtube: 'https://youtube.com', // PENDIENTE: URL oficial
    website: 'https://luzholistica.com.mx'
  },

  // ════════════════════════════════════════════
  // BRANDING VISUAL
  // ════════════════════════════════════════════
  branding: {
    colors: {
      purple: '#6b4e9e',
      purpleDark: '#4a3576',
      purpleDeep: '#1e1233',
      gold: '#d4a373',
      goldLight: '#f0c987',
      goldPale: '#f9e8c4',
      cream: '#e8ddc8',
      text: '#c8bbaa',
      white: '#ffffff'
    },
    typography: {
      serif: 'Cormorant Garamond',
      sansSerif: 'Inter'
    },
    assets: {
      logo: '../../../assets/img/logo.png',
      tarotImage: '../../../assets/img/tarot.png'
    }
  },

  // ════════════════════════════════════════════
  // TESTIMONIOS REALES
  // ════════════════════════════════════════════
  testimonials: [
    {
      name: 'Edgar Ortíz',
      profession: 'Licenciado',
      text: 'Me dio mucha claridad y entendimiento sobre lo que pasaba en mi vida.',
      photo: '../../../assets/img/Edgar.png'
    },
    {
      name: 'Armando García',
      profession: 'Microempresario',
      text: 'Antes creía que era feliz pero no sabía a dónde iba. Ahora sé que soy feliz y sé a dónde voy.',
      photo: '../../../assets/img/Armando.png'
    },
    {
      name: 'María de Jesús González',
      profession: 'Psicóloga',
      text: 'La interpretación de mi carta me dejó experiencias y conocimiento que no entendía de mí misma.',
      photo: '../../../assets/img/Maria.png'
    }
  ],

  // ════════════════════════════════════════════
  // TRACKING
  // ════════════════════════════════════════════
  tracking: {
    googleAnalyticsId: 'G_PENDING', // PENDIENTE
    metaPixelId: 'META_PIXEL_PENDING', // PENDIENTE
    tiktokPixelId: 'TIKTOK_PIXEL_PENDING', // PENDIENTE
    utmSource: 'landing-tarot-basico',
    utmMedium: 'organic',
    utmCampaign: 'tarot-basico-2026'
  },

  // ════════════════════════════════════════════
  // ASTROTHERAPY PRO
  // ════════════════════════════════════════════
  astrotherapyPro: {
    enabled: true,
    url: '../../../astrotherapy/',
    description: 'Herramienta de software para profesionales que utilizan Astrología'
  }
};

// Export para uso en scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
