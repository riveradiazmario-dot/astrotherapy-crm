// ─── AstroTherapy Pro — Capa de datos ────────────────────────────────────────
// Usa electron-store (JSON persistido en userData) — sin compilación nativa.

const Store = require('electron-store');

const store = new Store({
  name: 'astrotherapy-data',
  defaults: {
    clientes: [],
    sesiones: [],
    _nextClienteId: 1,
    _nextSesionId: 1,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextId(key) {
  const id = store.get(key);
  store.set(key, id + 1);
  return id;
}

function now() {
  return new Date().toISOString();
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

function listarClientes(query = '') {
  let lista = store.get('clientes') || [];
  if (query) {
    const q = query.toLowerCase();
    lista = lista.filter(c =>
      (c.nombre || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.telefono || '').includes(q)
    );
  }
  return lista.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
}

function obtenerCliente(id) {
  const lista = store.get('clientes') || [];
  return lista.find(c => c.id === id) || null;
}

function crearCliente(data) {
  const lista = store.get('clientes') || [];
  const cliente = {
    id: nextId('_nextClienteId'),
    nombre: data.nombre || '',
    email: data.email || '',
    telefono: data.telefono || '',
    fechaNacimiento: data.fechaNacimiento || '',
    horaNacimiento: data.horaNacimiento || '',
    lugarNacimiento: data.lugarNacimiento || '',
    especialidad: data.especialidad || '',
    genero: data.genero || '',
    notas: data.notas || '',
    etiquetas: data.etiquetas || [],
    totalSesiones: 0,
    ultimaSesion: null,
    creadoEn: now(),
    actualizadoEn: now(),
  };
  lista.push(cliente);
  store.set('clientes', lista);
  return cliente;
}

function actualizarCliente(id, data) {
  const lista = store.get('clientes') || [];
  const idx = lista.findIndex(c => c.id === id);
  if (idx === -1) return null;
  lista[idx] = { ...lista[idx], ...data, id, actualizadoEn: now() };
  store.set('clientes', lista);
  return lista[idx];
}

function eliminarCliente(id) {
  const lista = store.get('clientes') || [];
  store.set('clientes', lista.filter(c => c.id !== id));
  const sesiones = store.get('sesiones') || [];
  store.set('sesiones', sesiones.filter(s => s.clienteId !== id));
  return true;
}

function _recalcularContadores(clienteId) {
  const sesiones = (store.get('sesiones') || []).filter(s => s.clienteId === clienteId);
  const total = sesiones.length;
  const ultima = sesiones.length > 0
    ? sesiones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0].fecha
    : null;
  actualizarCliente(clienteId, { totalSesiones: total, ultimaSesion: ultima });
}

// ─── Sesiones ─────────────────────────────────────────────────────────────────

function listarSesiones(clienteId) {
  const sesiones = store.get('sesiones') || [];
  return sesiones
    .filter(s => s.clienteId === clienteId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function crearSesion(data) {
  const sesiones = store.get('sesiones') || [];
  const sesion = {
    id: nextId('_nextSesionId'),
    clienteId: data.clienteId,
    fecha: data.fecha || now(),
    duracionMin: data.duracionMin || 60,
    tipo: data.tipo || 'consulta',
    notas: data.notas || '',
    precio: data.precio || 0,
    pagado: data.pagado || false,
    creadoEn: now(),
  };
  sesiones.push(sesion);
  store.set('sesiones', sesiones);
  _recalcularContadores(data.clienteId);
  return sesion;
}

function eliminarSesion(id) {
  const sesiones = store.get('sesiones') || [];
  const sesion = sesiones.find(s => s.id === id);
  store.set('sesiones', sesiones.filter(s => s.id !== id));
  if (sesion) _recalcularContadores(sesion.clienteId);
  return true;
}

function statsGenerales() {
  const clientes = store.get('clientes') || [];
  const sesiones = store.get('sesiones') || [];
  const totalIngresos = sesiones.filter(s => s.pagado).reduce((sum, s) => sum + (s.precio || 0), 0);
  return {
    totalClientes: clientes.length,
    totalSesiones: sesiones.length,
    totalIngresos,
    sesionesEsteMes: sesiones.filter(s => {
      const d = new Date(s.fecha);
      const hoy = new Date();
      return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
    }).length,
  };
}

module.exports = {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  listarSesiones,
  crearSesion,
  eliminarSesion,
  statsGenerales,
};
