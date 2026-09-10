// Patch para agregar selector de plantillas antes de crear campaña
// Inyectar este código en index.html después del script principal

const EMAIL_TEMPLATES = [
  {
    id: 'welcome-astrologia',
    nombre: '✨ Bienvenida — Astrología Terapéutica',
    descripcion: 'Email profesional de bienvenida con información completa de servicios',
    asunto: '✨ ¡Bienvenido al Instituto de Astrología Terapéutica!',
  },
  {
    id: 'follow-up-consulta',
    nombre: '✨ Seguimiento — Tu Consulta te Espera',
    descripcion: 'Email de seguimiento con opciones y horarios disponibles',
    asunto: '✨ Tu Consulta te Espera - Información Completa',
  },
  {
    id: 're-engagement-special',
    nombre: '✨ Re-engagement — Vuelve a Tu Transformación',
    descripcion: 'Email de reactivación con oferta especial y descuento limitado',
    asunto: '✨ Reactivación Especial - Vuelve a Tu Transformación',
  },
];

// Guardar referencia a abrirWizard original
const abrirWizardOriginal = abrirWizard;

// Nueva función que abre selector de plantillas
function mostrarSelectorPlantillas() {
  const modal = document.createElement('div');
  modal.id = 'template-selector-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 900px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    ">
      <div style="
        text-align: center;
        margin-bottom: 40px;
      ">
        <h2 style="
          color: #1E1233;
          font-size: 28px;
          margin: 0 0 12px 0;
          font-weight: 700;
        ">Elige una Plantilla de Email</h2>
        <p style="
          color: #666;
          font-size: 14px;
          margin: 0;
        ">Selecciona una plantilla profesional para comenzar tu campaña</p>
      </div>

      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      ">
        ${EMAIL_TEMPLATES.map((template, idx) => `
          <div style="
            border: 2px solid #E8DDC8;
            border-radius: 8px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s;
            background: #f9f7f4;
          " onmouseover="this.style.borderColor='#F0C987'; this.style.boxShadow='0 4px 12px rgba(240, 201, 135, 0.3)'"
             onmouseout="this.style.borderColor='#E8DDC8'; this.style.boxShadow='none'"
             onclick="seleccionarPlantilla('${template.id}')">
            <h3 style="
              color: #1E1233;
              font-size: 16px;
              margin: 0 0 8px 0;
              font-weight: 700;
            ">${template.nombre}</h3>
            <p style="
              color: #666;
              font-size: 13px;
              margin: 0 0 15px 0;
              line-height: 1.5;
            ">${template.descripcion}</p>
            <button style="
              width: 100%;
              background: #F0C987;
              color: #1E1233;
              border: none;
              padding: 10px;
              border-radius: 4px;
              font-weight: 600;
              cursor: pointer;
              font-size: 14px;
            " onmouseover="this.opacity=0.9" onmouseout="this.opacity=1">
              Usar esta plantilla
            </button>
          </div>
        `).join('')}
      </div>

      <div style="
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      ">
        <button onclick="document.getElementById('template-selector-modal').remove()" style="
          padding: 10px 24px;
          border: 1px solid #E8DDC8;
          background: white;
          color: #1E1233;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        ">Cancelar</button>
        <button onclick="abrirWizardSinPlantilla()" style="
          padding: 10px 24px;
          border: none;
          background: #1E1233;
          color: white;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        ">Crear sin plantilla</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// Seleccionar plantilla
async function seleccionarPlantilla(templateId) {
  const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
  if (!template) return;

  // Cerrar modal
  document.getElementById('template-selector-modal')?.remove();

  // Obtener contenido HTML de la plantilla desde API
  try {
    const response = await fetch('/api/email-templates/' + templateId, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') }
    });

    if (!response.ok) throw new Error('No se pudo obtener la plantilla');

    const data = await response.json();
    const plantilla = data.template;

    // Abrir wizard con la plantilla cargada
    abrirWizardConPlantilla(plantilla);
  } catch (err) {
    console.error('Error al obtener plantilla:', err);
    abrirWizardConPlantilla(template);
  }
}

// Abrir wizard con plantilla
function abrirWizardConPlantilla(plantilla) {
  // Llamar al wizard original pero sin campaña preexistente
  abrirWizardOriginal(null);

  // Rellenar los datos de la plantilla
  document.getElementById('wz-asunto').value = plantilla.asunto || '';
  document.getElementById('wz-nombre').value = plantilla.nombre || '';

  // Si tiene HTML, cargarlo
  if (plantilla.htmlContent) {
    document.getElementById('wz-html').value = plantilla.htmlContent;
    document.getElementById('wz-vars-html').value = plantilla.htmlContent;

    // Intentar importar bloques
    if (typeof importHtmlToBlocks === 'function') {
      importHtmlToBlocks(plantilla.htmlContent);
    }
  }
}

// Abrir wizard sin plantilla
function abrirWizardSinPlantilla() {
  document.getElementById('template-selector-modal')?.remove();
  abrirWizardOriginal(null);
}

// Reemplazar la función abrirWizard
abrirWizard = function(campana = null) {
  // Si es una nueva campaña (campana === null), mostrar selector
  if (campana === null) {
    mostrarSelectorPlantillas();
  } else {
    // Si es edición, abrir wizard directamente
    abrirWizardOriginal(campana);
  }
};
