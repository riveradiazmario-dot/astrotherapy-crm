# AstroTherapy Pro — Beta 1.0
## App de escritorio para gestión de consultantes

---

## Instalación (primera vez)

```bash
# 1. Entrar a la carpeta
cd saas-astrologico/app-desktop

# 2. Instalar dependencias
npm install

# 3. Lanzar la app
npm start
```

Eso es todo. La base de datos se crea automáticamente en tu carpeta de usuario.

---

## Funciones disponibles en Beta 1.0

- **Lista de consultantes** con buscador en tiempo real
- **Ficha completa** por consultante: nombre, email, teléfono, fecha/hora/lugar de nacimiento, especialidad
- **Historial de sesiones** por consultante: tipo, duración, notas, precio, estado de pago
- **Estadísticas** globales (total consultantes, sesiones, ingresos)
- **Crear / Editar / Eliminar** consultantes
- **Registrar / Eliminar** sesiones
- **Persistencia local** — los datos se guardan automáticamente en tu equipo

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Desktop | Electron 28 |
| UI | HTML + CSS + JS vanilla |
| Datos | electron-store (JSON local) |
| Sin compilación nativa | ✓ |

---

## Roadmap v1.1

- [ ] Visualizador de carta natal (SVG)
- [ ] Exportar ficha de consultante a PDF
- [ ] Recordatorios de próxima sesión
- [ ] Análisis transgeneracional
- [ ] Backup y restauración de datos
