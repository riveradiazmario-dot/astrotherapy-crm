// ─── AstroTherapy Pro — Proceso principal Electron ───────────────────────────
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#F4F2FF',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'AstroTherapy Pro',
  });

  win.loadFile('index.html');

  if (process.argv.includes('--inspect')) {
    win.webContents.openDevTools();
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('clientes:listar', (_e, query) => db.listarClientes(query));
ipcMain.handle('clientes:obtener', (_e, id) => db.obtenerCliente(id));
ipcMain.handle('clientes:crear', (_e, data) => db.crearCliente(data));
ipcMain.handle('clientes:actualizar', (_e, id, data) => db.actualizarCliente(id, data));
ipcMain.handle('clientes:eliminar', (_e, id) => db.eliminarCliente(id));

ipcMain.handle('sesiones:listar', (_e, clienteId) => db.listarSesiones(clienteId));
ipcMain.handle('sesiones:crear', (_e, data) => db.crearSesion(data));
ipcMain.handle('sesiones:eliminar', (_e, id) => db.eliminarSesion(id));

ipcMain.handle('stats:generales', () => db.statsGenerales());

// ─── Ciclo de vida ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
