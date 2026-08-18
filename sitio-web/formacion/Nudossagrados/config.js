// CONFIG — Curso El Arte de Hacer Nudos Sagrados
// Todas las variables están centralizadas aquí para fácil mantenimiento

const CONFIG = {
  // ════════════════════════════════════════════
  // INFORMACIÓN DEL CURSO
  // ════════════════════════════════════════════
  course: {
    name: 'El Arte de Hacer Nudos Sagrados',
    concept: 'Un curso/taller práctico de introducción al significado y elaboración de nudos sagrados como herramienta simbólica de intención, transformación y manifestación.',
    startDate: 'Agosto 22, 2026',
    endDate: 'Septiembre 19, 2026',
    startTime: '8:30 PM',
    timeZone: 'América/México_City',
    sessions: 5,
    dayOfWeek: 'Sábados',
    durationPerSession: '2 horas',
    modality: 'ONLINE — ZOOM',
    level: 'Desde cero (No requiere experiencia previa)',
    materials: 'No se requiere material especial para realizar los nudos',
    recordings: 'Grabaciones incluidas con acceso de por vida',
    diploma: 'Manual del curso al finalizar'
  },

  // ════════════════════════════════════════════
  // FECHAS ESPECÍFICAS DE SESIONES
  // ════════════════════════════════════════════
  sessions: [
    { num: 1, date: 'Agosto 22, 2026', title: 'Fundamentos y el Nudo de Dios / Nudo del Vacío / Tierra', desc: 'Introducción al significado sagrado de los nudos como herramientas de intención. Elaboración y consagración del Nudo de Dios y Nudo del Vacío / Tierra.' },
    { num: 2, date: 'Agosto 29, 2026', title: 'Nudos de la Inteligencia y la Sabiduría', desc: 'Exploración de los símbolos y la geometría detrás de los nudos del intelecto y la sabiduría ancestral. Elaboración práctica.' },
    { num: 3, date: 'Septiembre 5, 2026', title: 'Nudos de la Luna y la Curación', desc: 'Conexión con los ciclos lunares y la energía sutil de sanación. Elaboración y aplicación del Nudo de la Luna y el Nudo de la Curación.' },
    { num: 4, date: 'Septiembre 12, 2026', title: 'Nudos del Limón y del Rayo', desc: 'Nudos dinámicos para la protección, activación energética y liberación de bloqueos. Práctica detallada paso a paso.' },
    { num: 5, date: 'Septiembre 19, 2026', title: 'Integración, Consagración y Cierre', desc: 'Cómo incorporar los nudos elaborados en tu práctica diaria o altar. Espacio para preguntas finales, entrega del Manual del Curso y ritual de cierre.' }
  ],

  // ════════════════════════════════════════════
  // STRIPE
  // ════════════════════════════════════════════
  stripe: {
    paymentUrl: 'https://buy.stripe.com/aFa5kCdib5r332Z0wvbo40e',
    paymentLinkId: 'plink_1U5WAyPMePCCzksWsViv1LBF',
    productId: 'prod_V5hZ56njC7hZ1W',
    priceId: 'price_1U5WAqPMePCCzksWO3M7xyO5',
    currency: 'MXN',
    price: 1232
  },

  // ════════════════════════════════════════════
  // INSTRUCTOR
  // ════════════════════════════════════════════
  instructor: {
    name: 'América',
    title: 'Instructora',
    photo: '../../../assets/img/america.jpg'
  },

  // ════════════════════════════════════════════
  // CONTACTO
  // ════════════════════════════════════════════
  contact: {
    whatsapp: '+52 555 651 8415',
    whatsappUrl: 'https://wa.me/525556518415',
    email: 'contacto@luzholistica.com.mx'
  }
};

// Export para uso en scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
