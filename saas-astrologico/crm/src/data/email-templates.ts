// Plantillas de Email predefinidas para Campañas de Marketing
export const EMAIL_TEMPLATES = [
  {
    id: 'welcome-astrologia',
    nombre: '✨ Bienvenida — Astrología Terapéutica',
    descripcion: 'Email profesional de bienvenida con información completa de servicios',
    tipo: 'bienvenida',
    asunto: '✨ ¡Bienvenido al Instituto de Astrología Terapéutica!',
    htmlContent: `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial; background: #f5f5f5; margin: 0; padding: 0;">
<table width="100%" style="background: #f5f5f5;" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding: 20px;">
      <table width="600" style="background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" cellpadding="0" cellspacing="0">
        <!-- HEADER -->
        <tr>
          <td style="background: #1E1233; padding: 30px 30px; text-align: center; border-bottom: 3px solid #F0C987;">
            <h1 style="color: #F0C987; margin: 0; font-size: 18px; font-weight: 600; line-height: 1.4;">Astrología Terapéutica<br>e Integración Energética</h1>
          </td>
        </tr>
        <!-- HERO -->
        <tr>
          <td style="background: linear-gradient(135deg, #F0C987 0%, #1E1233 100%); padding: 50px 30px; text-align: center;">
            <h1 style="color: white; font-size: 32px; margin: 0; text-transform: uppercase; letter-spacing: 2px; line-height: 1.3; font-weight: 700;">¡BIENVENIDO!</h1>
            <p style="color: rgba(255,255,255,0.95); font-size: 16px; margin: 15px 0 0 0; font-weight: 500;">Comienza tu viaje de transformación hoy</p>
          </td>
        </tr>
        <!-- CONTENT -->
        <tr>
          <td style="padding: 45px 35px; color: #333; line-height: 1.8;">
            <p style="color: #555; margin: 0 0 20px 0; font-size: 15px;">Estimado cliente,</p>
            <p style="color: #555; margin: 0 0 25px 0; font-size: 15px;">Nos complace recibirte en nuestro Instituto de Astrología Terapéutica. Hemos acompañado a más de 15,000 personas en su transformación personal a través del autoconocimiento astrológico y la integración energética profunda.</p>
            <h2 style="color: #1E1233; font-size: 22px; margin: 35px 0 25px 0; font-weight: 700; border-bottom: 2px solid #F0C987; padding-bottom: 12px;">🎯 Servicios Principales</h2>
            <p style="color: #555; margin: 0 0 20px 0; font-size: 15px;"><strong>📊 Lectura de Carta Natal</strong> - Análisis completo de tu propósito de vida - <strong>\$890 MXN</strong></p>
            <p style="color: #555; margin: 0 0 20px 0; font-size: 15px;"><strong>🔮 Lectura + Integración Energética</strong> - 2 sesiones transformadoras - <strong>\$1,490 MXN</strong></p>
            <p style="color: #555; margin: 0 0 25px 0; font-size: 15px;"><strong>✨ Paquete Transformación Completa</strong> - 3 sesiones + seguimiento 30 días - <strong>\$2,800 MXN</strong></p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://wa.me/5255651841" style="display: inline-block; background: #F0C987; color: #1E1233; padding: 16px 45px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(240, 201, 135, 0.3);">AGENDAR CONSULTA</a>
            </div>
          </td>
        </tr>
        <!-- FOOTER -->
        <tr>
          <td style="background: linear-gradient(135deg, #3d2563 0%, #4a2e7f 100%); color: #F0C987; padding: 40px 35px; text-align: center; font-size: 12px;">
            <p style="font-size: 15px; font-weight: 700; margin: 0 0 16px 0; color: #F0C987;">Astrología Terapéutica e Integración Energética</p>
            <p style="margin: 12px 0;"><a href="https://wa.me/5255651841" style="color: #F0C987; text-decoration: none; font-weight: 600;">📱 WhatsApp: +52 555 651 8415</a></p>
            <p style="margin: 8px 0;"><a href="mailto:contacto@luzholistica.com.mx" style="color: #F0C987; text-decoration: none; font-weight: 600;">✉️ Email: contacto@luzholistica.com.mx</a></p>
            <div style="font-size: 11px; color: #b8a0d8; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(240, 201, 135, 0.3);">© 2026 Astrología Terapéutica | Más de 15,000 transformaciones</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
  },
  {
    id: 'follow-up-consulta',
    nombre: '✨ Seguimiento — Tu Consulta te Espera',
    descripcion: 'Email de seguimiento con opciones y horarios disponibles',
    tipo: 'seguimiento',
    asunto: '✨ Tu Consulta te Espera - Información Completa',
    htmlContent: `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial; background: #f5f5f5; margin: 0; padding: 0;">
<table width="100%" style="background: #f5f5f5;" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding: 20px;">
      <table width="600" style="background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background: #1E1233; padding: 30px 30px; text-align: center; border-bottom: 3px solid #F0C987;">
            <h1 style="color: #F0C987; margin: 0; font-size: 18px; font-weight: 600; line-height: 1.4;">Astrología Terapéutica<br>e Integración Energética</h1>
          </td>
        </tr>
        <tr>
          <td style="background: linear-gradient(135deg, #F0C987 0%, #1E1233 100%); padding: 50px 30px; text-align: center;">
            <h1 style="color: white; font-size: 32px; margin: 0; text-transform: uppercase; letter-spacing: 2px; line-height: 1.3; font-weight: 700;">Tu Consulta te Espera</h1>
            <p style="color: rgba(255,255,255,0.95); font-size: 16px; margin: 15px 0 0 0; font-weight: 500;">Información completa sobre tu lectura astrológica</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 45px 35px; color: #333; line-height: 1.8;">
            <p style="color: #555; margin: 0 0 20px 0; font-size: 15px;">Hola,</p>
            <p style="color: #555; margin: 0 0 25px 0; font-size: 15px;">Agradecemos tu interés en comenzar esta transformación. A continuación encontrarás toda la información que necesitas para tu consulta astrológica.</p>
            <h2 style="color: #1E1233; font-size: 22px; margin: 35px 0 25px 0; font-weight: 700; border-bottom: 2px solid #F0C987; padding-bottom: 12px;">📋 Qué Esperar</h2>
            <p style="color: #555; margin: 12px 0; font-size: 14px;"><strong>⏱️ Duración:</strong> 60 minutos de análisis personalizado</p>
            <p style="color: #555; margin: 12px 0; font-size: 14px;"><strong>💻 Modalidad:</strong> Online (Zoom) o Presencial</p>
            <p style="color: #555; margin: 12px 0; font-size: 14px;"><strong>👤 Especialista:</strong> Profesional con +20 años de experiencia</p>
            <h2 style="color: #1E1233; font-size: 22px; margin: 35px 0 25px 0; font-weight: 700; border-bottom: 2px solid #F0C987; padding-bottom: 12px;">💰 Opciones de Pago</h2>
            <p style="color: #555; margin: 12px 0; font-size: 14px;">✓ Lectura Estándar: <strong>\$890 MXN</strong></p>
            <p style="color: #555; margin: 12px 0; font-size: 14px;">✓ Lectura + Integración: <strong>\$1,290 MXN</strong></p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://wa.me/5255651841" style="display: inline-block; background: #F0C987; color: #1E1233; padding: 16px 45px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">SELECCIONA TU HORARIO</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background: linear-gradient(135deg, #3d2563 0%, #4a2e7f 100%); color: #F0C987; padding: 40px 35px; text-align: center; font-size: 12px;">
            <p style="font-size: 15px; font-weight: 700; margin: 0 0 16px 0; color: #F0C987;">Astrología Terapéutica e Integración Energética</p>
            <p style="margin: 12px 0;"><a href="https://wa.me/5255651841" style="color: #F0C987; text-decoration: none;">📱 WhatsApp: +52 555 651 8415</a></p>
            <div style="font-size: 11px; color: #b8a0d8; margin-top: 20px;">© 2026 Instituto | Más de 15,000 transformaciones</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
  },
  {
    id: 're-engagement-special',
    nombre: '✨ Re-engagement — Vuelve a Tu Transformación',
    descripcion: 'Email de reactivación con oferta especial y descuento limitado',
    tipo: 're-engagement',
    asunto: '✨ Reactivación Especial - Vuelve a Tu Transformación',
    htmlContent: `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial; background: #f5f5f5; margin: 0; padding: 0;">
<table width="100%" style="background: #f5f5f5;" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding: 20px;">
      <table width="600" style="background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background: #1E1233; padding: 30px 30px; text-align: center; border-bottom: 3px solid #F0C987;">
            <h1 style="color: #F0C987; margin: 0; font-size: 18px; font-weight: 600; line-height: 1.4;">Astrología Terapéutica<br>e Integración Energética</h1>
          </td>
        </tr>
        <tr>
          <td style="background: linear-gradient(135deg, #1E1233 0%, #F0C987 100%); padding: 50px 30px; text-align: center;">
            <h1 style="color: white; font-size: 32px; margin: 0; text-transform: uppercase; letter-spacing: 2px; line-height: 1.3; font-weight: 700;"> Vuelve a Tu Transformación</h1>
            <p style="color: rgba(255,255,255,0.95); font-size: 16px; margin: 15px 0 0 0; font-weight: 500;">Una segunda oportunidad está aquí para ti</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 45px 35px; color: #333; line-height: 1.8;">
            <p style="color: #555; margin: 0 0 20px 0; font-size: 15px;">Hola de nuevo,</p>
            <p style="color: #555; margin: 0 0 25px 0; font-size: 15px;">Hace algunos meses consideraste explorar tu transformación. Los astros te vuelven a llamar. OFERTA ESPECIAL: <strong>\$1,490 MXN</strong> (Ahorra \$1,310).</p>
            <h2 style="color: #1E1233; font-size: 22px; margin: 35px 0 25px 0; font-weight: 700; border-bottom: 2px solid #F0C987; padding-bottom: 12px;">🎁 Tu Paquete Especial</h2>
            <p style="color: #1E1233; font-size: 14px; margin: 10px 0; font-weight: 600;">✓ Carta Natal Completa</p>
            <p style="color: #666; font-size: 13px; margin: 0 0 15px 0;">Análisis profundo renovado de tu mapa astrológico</p>
            <p style="color: #1E1233; font-size: 14px; margin: 10px 0; font-weight: 600;">✓ Integración Energética + Reporte</p>
            <p style="color: #666; font-size: 13px; margin: 0 0 15px 0;">Sesión transformadora de sanación</p>
            <p style="color: #F0C987; font-size: 18px; margin: 15px 0; font-weight: 700;">PRECIO: \$1,490 MXN</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://wa.me/5255651841" style="display: inline-block; background: #F0C987; color: #1E1233; padding: 16px 45px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">RECLAMAR OFERTA AHORA</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background: linear-gradient(135deg, #3d2563 0%, #4a2e7f 100%); color: #F0C987; padding: 40px 35px; text-align: center; font-size: 12px;">
            <p style="font-size: 15px; font-weight: 700; margin: 0 0 16px 0; color: #F0C987;">Astrología Terapéutica e Integración Energética</p>
            <p style="margin: 12px 0;"><a href="https://wa.me/5255651841" style="color: #F0C987; text-decoration: none;">📱 WhatsApp: +52 555 651 8415</a></p>
            <div style="font-size: 11px; color: #b8a0d8; margin-top: 20px;">© 2026 Instituto | ✨ Más de 15,000 transformaciones</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
  },
];
