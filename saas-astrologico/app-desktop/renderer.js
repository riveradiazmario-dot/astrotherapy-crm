// ─── AstroTherapy Pro — Renderer (SPA) ───────────────────────────────────────

// ── Estado global ──────────────────────────────────────────────────────────────
let state = {
  clientes: [],
  clienteActivo: null,
  tabActiva: 'info',
  sesiones: [],
  editando: false, // true = editar, false = crear
};

// ── Paleta de avatares ─────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#EEEDFE', '#6B5BCC'], ['#E1F5EE', '#0F6E56'],
  ['#FAEEDA', '#854F0B'], ['#E6F1FB', '#185FA5'],
  ['#FAECE7', '#993C1D'], ['#EAF3DE', '#3B6D11'],
  ['#E0F7F5', '#0E7C73'], ['#FBEAF0', '#993556'],
];

function avatarColors(str) {
  let h = 0;
  for (const c of (str || 'X')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(nombre) {
  if (!nombre) return '?';
  return nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// ── Helpers de fecha ───────────────────────────────────────────────────────────
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatFechaNac(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  if (!y || !m || !d) return str;
  const edad = new Date().getFullYear() - parseInt(y);
  return `${d}/${m}/${y} (${edad} años)`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const ESP_LABELS = {
  astrologia: 'Astrología', astrologia_vedica: 'Astrología védica',
  tarot: 'Tarot', constelaciones: 'Constelaciones', reiki: 'Reiki',
  coaching: 'Coaching holístico', numerologia: 'Numerología',
  regresion: 'Regresión', otro: 'Otro',
};

// ── Toast ──────────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Modal helpers ──────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ── Sidebar: renderizar lista ──────────────────────────────────────────────────
function renderSidebar() {
  const container = document.getElementById('sidebar-clients');
  const label = document.getElementById('clients-count');
  const { clientes } = state;

  label.textContent = `Consultantes (${clientes.length})`;

  if (!clientes.length) {
    container.innerHTML = `<div style="padding:24px 12px; text-align:center; color:#9B97B0; font-size:12px; line-height:1.6;">
      <div style="font-size:28px; margin-bottom:8px; opacity:0.4;">🌙</div>
      Aún no hay consultantes.<br/>Haz clic en "Nuevo consultante".
    </div>`;
    return;
  }

  container.innerHTML = clientes.map(c => {
    const [bg, fg] = avatarColors(c.nombre);
    const isActive = state.clienteActivo && state.clienteActivo.id === c.id;
    return `<div class="client-item ${isActive ? 'active' : ''}" data-id="${c.id}">
      <div class="client-avatar" style="background:${bg}; color:${fg};">${initials(c.nombre)}</div>
      <div class="client-info">
        <div class="client-name">${c.nombre || '(sin nombre)'}</div>
        <div class="client-meta">${ESP_LABELS[c.especialidad] || c.especialidad || '—'} · ${c.totalSesiones || 0} sesión(es)</div>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.client-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.id);
      selectCliente(id);
    });
  });
}

// ── Área principal: estados ────────────────────────────────────────────────────

function renderHome() {
  window.api.statsGenerales().then(stats => {
    document.getElementById('main-area').innerHTML = `
    <div class="home-wrap">
      <div class="home-title">Bienvenido a AstroTherapy Pro ✦</div>
      <div class="home-sub">Gestiona tus consultantes, sesiones e historial en un solo lugar.</div>
      <div class="home-stats">
        <div class="home-stat">
          <div class="home-stat-icon">👥</div>
          <div class="home-stat-label">Total consultantes</div>
          <div class="home-stat-val">${stats.totalClientes}</div>
        </div>
        <div class="home-stat">
          <div class="home-stat-icon">📅</div>
          <div class="home-stat-label">Sesiones totales</div>
          <div class="home-stat-val">${stats.totalSesiones}</div>
        </div>
        <div class="home-stat">
          <div class="home-stat-icon">📅</div>
          <div class="home-stat-label">Sesiones este mes</div>
          <div class="home-stat-val">${stats.sesionesEsteMes}</div>
        </div>
        <div class="home-stat">
          <div class="home-stat-icon">💰</div>
          <div class="home-stat-label">Ingresos registrados</div>
          <div class="home-stat-val">$${stats.totalIngresos.toLocaleString('es-MX')}</div>
        </div>
      </div>
      ${stats.totalClientes === 0 ? `
      <div style="background:white; border:1px solid #E5E2F5; border-radius:12px; padding:28px; text-align:center; color:#9B97B0; max-width:460px; margin:0 auto;">
        <div style="font-size:42px; margin-bottom:12px;">🌙</div>
        <div style="font-size:15px; font-weight:600; color:#1A1525; margin-bottom:8px;">Empieza agregando tu primer consultante</div>
        <div style="font-size:13px; margin-bottom:20px; line-height:1.6;">Registra su nombre, fecha y lugar de nacimiento, y lleva un historial completo de sus sesiones.</div>
        <button onclick="document.getElementById('btn-new-client').click()" style="padding:10px 24px; background:#6B5BCC; color:white; border:none; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer;">
          + Nuevo consultante
        </button>
      </div>` : ''}
    </div>`;
  });
}

// ── Detalle de cliente ─────────────────────────────────────────────────────────

async function renderDetalle() {
  const c = state.clienteActivo;
  if (!c) { renderHome(); return; }

  const [bg, fg] = avatarColors(c.nombre);

  document.getElementById('main-area').innerHTML = `
  <div class="detail-wrap">
    <div class="detail-header">
      <div class="detail-top">
        <div class="detail-avatar" style="background:${bg}; color:${fg};">${initials(c.nombre)}</div>
        <div style="flex:1; min-width:0;">
          <div class="detail-name">${c.nombre || '(sin nombre)'}</div>
          <div class="detail-sub">${ESP_LABELS[c.especialidad] || c.especialidad || '—'} · ${c.email || 'Sin email'}</div>
        </div>
        <div class="detail-actions">
          <button class="btn-icon" id="btn-edit-cliente">✏️ Editar</button>
          <button class="btn-icon primary" id="btn-add-sesion">+ Sesión</button>
          <button class="btn-icon danger" id="btn-delete-cliente">🗑</button>
        </div>
      </div>
      <div class="detail-tabs">
        <button class="tab-btn ${state.tabActiva==='info'?'active':''}" data-tab="info">Información</button>
        <button class="tab-btn ${state.tabActiva==='sesiones'?'active':''}" data-tab="sesiones">Sesiones (${c.totalSesiones||0})</button>
        <button class="tab-btn ${state.tabActiva==='notas'?'active':''}" data-tab="notas">Notas</button>
      </div>
    </div>
    <div class="detail-body" id="detail-body"><!-- contenido de pestaña --></div>
  </div>`;

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tabActiva = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tabActiva));
      renderTab();
    });
  });

  // Botones
  document.getElementById('btn-edit-cliente').addEventListener('click', () => abrirModalEditar());
  document.getElementById('btn-add-sesion').addEventListener('click', () => abrirModalSesion());
  document.getElementById('btn-delete-cliente').addEventListener('click', () => confirmarEliminar());

  await renderTab();
}

async function renderTab() {
  const body = document.getElementById('detail-body');
  if (!body) return;

  if (state.tabActiva === 'info') {
    renderTabInfo(body);
  } else if (state.tabActiva === 'sesiones') {
    await renderTabSesiones(body);
  } else if (state.tabActiva === 'notas') {
    renderTabNotas(body);
  }
}

function renderTabInfo(body) {
  const c = state.clienteActivo;
  body.innerHTML = `
  <div class="info-grid">
    <div class="info-card">
      <div class="info-card-title">Datos de contacto</div>
      <div class="info-row"><span class="info-label">Nombre</span><span class="info-val">${c.nombre||'—'}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-val">${c.email||'—'}</span></div>
      <div class="info-row"><span class="info-label">Teléfono</span><span class="info-val">${c.telefono||'—'}</span></div>
      <div class="info-row"><span class="info-label">Género</span><span class="info-val">${c.genero||'—'}</span></div>
    </div>
    <div class="info-card">
      <div class="info-card-title">Datos natales</div>
      <div class="info-row"><span class="info-label">Fecha nacimiento</span><span class="info-val">${formatFechaNac(c.fechaNacimiento)}</span></div>
      <div class="info-row"><span class="info-label">Hora nacimiento</span><span class="info-val">${c.horaNacimiento||'—'}</span></div>
      <div class="info-row"><span class="info-label">Lugar nacimiento</span><span class="info-val">${c.lugarNacimiento||'—'}</span></div>
    </div>
    <div class="info-card">
      <div class="info-card-title">Especialidad</div>
      <div class="info-row"><span class="info-label">Tipo de consulta</span><span class="info-val">${ESP_LABELS[c.especialidad]||c.especialidad||'—'}</span></div>
    </div>
    <div class="info-card">
      <div class="info-card-title">Actividad</div>
      <div class="info-row"><span class="info-label">Total sesiones</span><span class="info-val">${c.totalSesiones||0}</span></div>
      <div class="info-row"><span class="info-label">Última sesión</span><span class="info-val">${formatFecha(c.ultimaSesion)}</span></div>
      <div class="info-row"><span class="info-label">Cliente desde</span><span class="info-val">${formatFecha(c.creadoEn)}</span></div>
    </div>
  </div>`;
}

async function renderTabSesiones(body) {
  const sesiones = await window.api.listarSesiones(state.clienteActivo.id);
  state.sesiones = sesiones;

  if (!sesiones.length) {
    body.innerHTML = `<div class="empty-sesiones">
      <div class="empty-sesiones-icon">📅</div>
      <div style="font-size:14px; font-weight:500; color:#6B6480; margin-bottom:6px;">Sin sesiones registradas</div>
      <div style="font-size:12px;">Haz clic en "+ Sesión" para registrar la primera.</div>
    </div>`;
    return;
  }

  const totalPagado = sesiones.filter(s=>s.pagado).reduce((sum,s)=>sum+(s.precio||0),0);
  const totalPendiente = sesiones.filter(s=>!s.pagado && s.precio>0).reduce((sum,s)=>sum+(s.precio||0),0);

  body.innerHTML = `
  <div class="stats-row">
    <div class="stat-card"><div class="stat-label">Total sesiones</div><div class="stat-val">${sesiones.length}</div></div>
    <div class="stat-card"><div class="stat-label">Ingresos cobrados</div><div class="stat-val">$${totalPagado.toLocaleString('es-MX')}</div></div>
    <div class="stat-card"><div class="stat-label">Por cobrar</div><div class="stat-val" style="color:${totalPendiente>0?'#EF9F27':'#1A1525'};">$${totalPendiente.toLocaleString('es-MX')}</div></div>
  </div>
  <div id="sesiones-list">
    ${sesiones.map(s => {
      const d = new Date(s.fecha);
      const dia = isNaN(d) ? '?' : d.getDate();
      const mes = isNaN(d) ? '?' : MESES[d.getMonth()].toUpperCase();
      return `<div class="sesion-card">
        <div class="sesion-date-block">
          <div class="sesion-day">${dia}</div>
          <div class="sesion-month">${mes}</div>
        </div>
        <div class="sesion-body">
          <div class="sesion-tipo">
            <span class="badge-tipo">${s.tipo || 'consulta'}</span>
            ${s.precio > 0 ? (s.pagado
              ? '<span class="badge-pagado">✓ Pagado</span>'
              : '<span class="badge-pendiente">⏳ Pendiente</span>') : ''}
            ${s.precio > 0 ? `<span style="font-size:11px; color:#9B97B0;">$${s.precio.toLocaleString('es-MX')}</span>` : ''}
          </div>
          ${s.notas ? `<div class="sesion-notes">${s.notas}</div>` : ''}
          <div class="sesion-meta">
            <span>⏱ ${s.duracionMin || 60} min</span>
            <span>📅 ${formatFecha(s.fecha)}</span>
          </div>
        </div>
        <div class="sesion-actions">
          <button class="btn-delete" data-sesion-id="${s.id}" title="Eliminar sesión">✕</button>
        </div>
      </div>`;
    }).join('')}
  </div>`;

  document.querySelectorAll('.btn-delete[data-sesion-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta sesión?')) return;
      await window.api.eliminarSesion(parseInt(btn.dataset.sesionId));
      const updated = await window.api.obtenerCliente(state.clienteActivo.id);
      state.clienteActivo = updated;
      await cargarClientes();
      await renderTabSesiones(body);
      toast('Sesión eliminada');
    });
  });
}

function renderTabNotas(body) {
  const c = state.clienteActivo;
  body.innerHTML = `
  <div class="info-card" style="margin-bottom:0;">
    <div class="info-card-title">Notas del consultante</div>
    <div id="notas-content">
      ${c.notas
        ? `<div class="notes-text">${c.notas}</div>`
        : `<div style="color:#9B97B0; font-size:13px; padding:8px 0;">Sin notas. Edita el perfil para agregar.</div>`}
    </div>
  </div>`;
}

// ── Seleccionar cliente ────────────────────────────────────────────────────────

async function selectCliente(id) {
  const c = await window.api.obtenerCliente(id);
  state.clienteActivo = c;
  state.tabActiva = 'info';
  renderSidebar();
  await renderDetalle();
}

// ── Cargar lista ───────────────────────────────────────────────────────────────

async function cargarClientes(query = '') {
  state.clientes = await window.api.listarClientes(query);
  renderSidebar();
}

// ── Modal: Nuevo cliente ───────────────────────────────────────────────────────

document.getElementById('btn-new-client').addEventListener('click', () => {
  state.editando = false;
  document.getElementById('modal-cliente-title').textContent = 'Nuevo consultante';
  ['nombre','email','telefono','lugar-nac','notas'].forEach(k => {
    document.getElementById('f-'+k).value = '';
  });
  document.getElementById('f-fecha-nac').value = '';
  document.getElementById('f-hora-nac').value = '';
  document.getElementById('f-especialidad').value = '';
  document.getElementById('f-genero').value = '';
  openModal('modal-cliente');
});

document.getElementById('btn-cancel-cliente').addEventListener('click', () => closeModal('modal-cliente'));

document.getElementById('btn-submit-cliente').addEventListener('click', async () => {
  const nombre = document.getElementById('f-nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }

  const data = {
    nombre,
    email: document.getElementById('f-email').value.trim(),
    telefono: document.getElementById('f-telefono').value.trim(),
    fechaNacimiento: document.getElementById('f-fecha-nac').value,
    horaNacimiento: document.getElementById('f-hora-nac').value,
    lugarNacimiento: document.getElementById('f-lugar-nac').value.trim(),
    especialidad: document.getElementById('f-especialidad').value,
    genero: document.getElementById('f-genero').value,
    notas: document.getElementById('f-notas').value.trim(),
  };

  if (state.editando && state.clienteActivo) {
    const updated = await window.api.actualizarCliente(state.clienteActivo.id, data);
    state.clienteActivo = updated;
    toast('Consultante actualizado ✓');
  } else {
    const nuevo = await window.api.crearCliente(data);
    state.clienteActivo = nuevo;
    state.tabActiva = 'info';
    toast('Consultante creado ✓');
  }

  closeModal('modal-cliente');
  await cargarClientes();
  await renderDetalle();
});

// ── Modal: Editar cliente ──────────────────────────────────────────────────────

function abrirModalEditar() {
  const c = state.clienteActivo;
  if (!c) return;
  state.editando = true;
  document.getElementById('modal-cliente-title').textContent = 'Editar consultante';
  document.getElementById('f-nombre').value = c.nombre || '';
  document.getElementById('f-email').value = c.email || '';
  document.getElementById('f-telefono').value = c.telefono || '';
  document.getElementById('f-fecha-nac').value = c.fechaNacimiento || '';
  document.getElementById('f-hora-nac').value = c.horaNacimiento || '';
  document.getElementById('f-lugar-nac').value = c.lugarNacimiento || '';
  document.getElementById('f-especialidad').value = c.especialidad || '';
  document.getElementById('f-genero').value = c.genero || '';
  document.getElementById('f-notas').value = c.notas || '';
  openModal('modal-cliente');
}

// ── Modal: Nueva sesión ────────────────────────────────────────────────────────

function abrirModalSesion() {
  document.getElementById('s-fecha').value = todayISO();
  document.getElementById('s-duracion').value = 60;
  document.getElementById('s-tipo').value = 'consulta';
  document.getElementById('s-precio').value = 0;
  document.getElementById('s-pagado').checked = false;
  document.getElementById('s-notas').value = '';
  openModal('modal-sesion');
}

document.getElementById('btn-cancel-sesion').addEventListener('click', () => closeModal('modal-sesion'));

document.getElementById('btn-submit-sesion').addEventListener('click', async () => {
  if (!state.clienteActivo) return;
  const fecha = document.getElementById('s-fecha').value;
  if (!fecha) { toast('La fecha es obligatoria', 'error'); return; }

  const data = {
    clienteId: state.clienteActivo.id,
    fecha: new Date(fecha + 'T12:00:00').toISOString(),
    duracionMin: parseInt(document.getElementById('s-duracion').value) || 60,
    tipo: document.getElementById('s-tipo').value,
    precio: parseFloat(document.getElementById('s-precio').value) || 0,
    pagado: document.getElementById('s-pagado').checked,
    notas: document.getElementById('s-notas').value.trim(),
  };

  await window.api.crearSesion(data);
  const updated = await window.api.obtenerCliente(state.clienteActivo.id);
  state.clienteActivo = updated;
  closeModal('modal-sesion');
  state.tabActiva = 'sesiones';
  await cargarClientes();
  await renderDetalle();
  toast('Sesión registrada ✓');
});

// ── Eliminar cliente ───────────────────────────────────────────────────────────

async function confirmarEliminar() {
  const c = state.clienteActivo;
  if (!c) return;
  if (!confirm(`¿Eliminar a ${c.nombre} y todas sus sesiones? Esta acción no se puede deshacer.`)) return;
  await window.api.eliminarCliente(c.id);
  state.clienteActivo = null;
  toast('Consultante eliminado');
  await cargarClientes();
  renderHome();
}

// ── Búsqueda ───────────────────────────────────────────────────────────────────

let searchTimeout;
document.getElementById('search-input').addEventListener('input', e => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => cargarClientes(e.target.value.trim()), 250);
});

// ── Init ───────────────────────────────────────────────────────────────────────

async function init() {
  await cargarClientes();
  renderHome();
}

init();
