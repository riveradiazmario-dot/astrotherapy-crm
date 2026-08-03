// ─── AstroTherapy Pro — Preload (Context Bridge) ─────────────────────────────
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Clientes
  listarClientes: (query) => ipcRenderer.invoke('clientes:listar', query),
  obtenerCliente: (id) => ipcRenderer.invoke('clientes:obtener', id),
  crearCliente: (data) => ipcRenderer.invoke('clientes:crear', data),
  actualizarCliente: (id, data) => ipcRenderer.invoke('clientes:actualizar', id, data),
  eliminarCliente: (id) => ipcRenderer.invoke('clientes:eliminar', id),

  // Sesiones
  listarSesiones: (clienteId) => ipcRenderer.invoke('sesiones:listar', clienteId),
  crearSesion: (data) => ipcRenderer.invoke('sesiones:crear', data),
  eliminarSesion: (id) => ipcRenderer.invoke('sesiones:eliminar', id),

  // Stats
  statsGenerales: () => ipcRenderer.invoke('stats:generales'),
});
