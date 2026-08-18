// CONFIG — Círculo de Sanación Femenina: Memorias del Útero
// Todas las variables están centralizadas aquí para fácil mantenimiento

const CONFIG = {
  // ════════════════════════════════════════════
  // INFORMACIÓN DEL TALLER
  // ════════════════════════════════════════════
  workshop: {
    name: 'Círculo de Sanación Femenina: Memorias del Útero',
    concept: '"El útero es un portal de luz y amor, no un almacén de miedo."',
    subconcept: 'Un taller vivencial para conectar con tu historia, tu linaje y tu energía creadora.',
    date: 'Agosto 30, 2026',
    time: '11:00 AM a 1:00 PM',
    timeZone: 'Hora del Centro de México',
    duration: '2 horas',
    sessions: 1,
    modality: 'ONLINE — ZOOM',
    recordings: 'No será grabado (Taller 100% en vivo)',
    level: 'No se requiere experiencia previa',
    materials: 'No se requieren materiales especiales',
    included: 'Taller vivencial de una sola sesión (No incluye manual ni material adicional)'
  },

  // ════════════════════════════════════════════
  // STRIPE — PENDIENTE DE CONFIGURACIÓN
  // Para activar: crear producto ($600 MXN), precio y Payment Link en Stripe test mode.
  // Reemplazar paymentUrl con la URL real y actualizar los botones en index.html.
  // ════════════════════════════════════════════
  stripe: {
    paymentUrl: 'https://buy.stripe.com/cNi7sKemfcTv5b7djhbo40c',
    paymentLinkId: null,
    productId: null,
    priceId: null,
    currency: 'MXN',
    price: 600
  },

  // ════════════════════════════════════════════
  // FACILITADORA
  // ════════════════════════════════════════════
  instructor: {
    name: 'América Arroyo',
    title: 'Facilitadora',
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
