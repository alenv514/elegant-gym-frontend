# Elegant for Gym — SaaS PWA 🏋️‍♂️✨

**Elegant for Gym** es una plataforma SaaS multi-tenant (marca blanca) para la gestión integral de gimnasios independientes y centros deportivos. Permite automatizar cobranzas, control de miembros, gestión de clases, métricas físicas (IMC) y envío de recordatorios automáticos por WhatsApp — todo con costo de infraestructura **$0 USD**.

---

## 🎯 ¿Por qué se creó esta app?

Los gimnasios independientes sufren dos problemas principales:
1. **Alta morosidad y deserción:** ~30-40% de los socios olvidan el vencimiento de su cuota mensual.
2. **Costos elevados de software:** El software tradicional cobra comisiones o tarifas mensuales inaccesibles.

**Elegant for Gym** resuelve esto con:
- **Automatización por WhatsApp:** Notificaciones de cobranza directamente al WhatsApp del socio sin APIs costosas (vía `@whiskeysockets/baileys`).
- **Modelo SaaS $0 USD:** Construido sobre capas gratuitas de proveedores cloud.
- **Experiencia premium:** Interfaz elegante dorada/oscura, instalable como App nativa (PWA).

---

## 🛠️ Stack Tecnológico ($0 USD)

| Componente | Tecnología | Plataforma | Costo |
| :--- | :--- | :--- | :--- |
| **Frontend PWA** | React 18 + Vite + Workbox | **Cloudflare Pages** | `$0` |
| **Backend REST API** | Node.js + Express + node-cron | **Koyeb** (pendiente) | `$0` |
| **Base de Datos** | PostgreSQL + 11 tablas | Supabase | `$0` |
| **WhatsApp** | @whiskeysockets/baileys | Backend (local/nube) | `$0` |

---

## 📦 Funcionalidades Completadas ✅

### 🔐 Autenticación y Roles
- **Login con JWT + bcrypt** (backend: `POST /api/auth/login`)
- **Interceptor axios** que redirige a `/login` si el token expira (401)
- **Roles:** `saas_owner` (acceso global) y `gym_owner` (solo su gimnasio)
- **Suspensión automática SaaS:** si el gym no paga su cuota SaaS, a los 2 días de gracia se desactiva automáticamente (403 con página `Suspended.jsx`)
- botón "Contactar Soporte" en la pantalla de suspensión que envía WhatsApp al dueño del SaaS

### 📊 Dashboard (Panel General)
- Miembros activos totales (conteo real desde DB)
- Clases registradas en el sistema
- Pagos pendientes (por vencer o vencidos)
- Ingresos del mes (suma de `member_payments`)
- Lista de clases del día con instructores y cupos
- Miembros próximos a vencer (próximos 5 días)
- Tarjetas interactivas con íconos y colores

### 👥 Miembros (CRUD Completo)
- **Lista** con buscador por nombre y filtros por estado (activo/por vencer/vencido)
- **Crear miembro** con selección de plan, fecha de inicio y toggle opt-in WhatsApp
- **Editar miembro** (nombre, teléfono, email, plan, opt-in WhatsApp)
- **Eliminar miembro** con confirmación y manejo correcto de FK (cascade en pagos)
- **Ficha individual** con:
  - Datos personales y plan contratado
  - Peso (kg) y altura (m) editables
  - **IMC calculado automáticamente** (`peso / altura²`) con clasificación médica
  - Clase asignada del día actual
  - **Historial de peso/altura/IMC** para ver evolución en gráfica temporal

### 📋 Clases (CRUD Completo)
- **Crear clase** con nombre, instructor, capacidad máxima, horarios (día + hora) y descripción
- **Editar clase** con modal precargado
- **Eliminar clase** con confirmación
- **Barra de capacidad** visual (verde/amarillo/rojo según ocupación)
- **Inscripción de miembros** con buscador tipo lupa 🔍 (filtra por nombre en tiempo real)
- **Ver solo los miembros inscritos** en cada clase (endpoint dedicado GET /classes/:id/members)
- **Desinscripción** de miembros con confirmación

### 💰 Pagos
- **Registrar pago** manual (efectivo o transferencia) con selección de miembro
- **Extensión automática** de la membresía: si está vencida, se extiende desde hoy; si está activa, se acumula
- **Historial completo** con totales por método de pago
- Desglose visual: total histórico / efectivo / transferencia

### 📱 WhatsApp
- **Conexión por código QR** + refresco automático
- **Código de vinculación** (pairing code) — alternativa al QR, ingresas un código de 8 dígitos en la app de WhatsApp
- **Indicador de estado** en tiempo real con polling cada 5s (🔴 Desconectado / 🟢 Conectado / 🟡 Conectando)
- **Desconexión** segura con limpieza de sesión
- **Estabilidad:** Manejo de `restartRequired`, `loggedOut`, `badSession`, rate limiting (429), reconexión automática
- Mensaje personalizado: "Elegant for Gym" en lugar del nombre del gym en BD

### 🤖 Recordatorios Automáticos (Cron Job)
- **Cron diario a las 09:00 AM** usando `node-cron` (se programa al iniciar el backend)
- Envía WhatsApp a miembros cuya membresía **vence en exactamente 2 días**
- Envía WhatsApp a miembros con membresía **vencida hace exactamente 1 día**
- Solo a miembros con `opt_in_whatsapp = true`
- **Registro en DB** (`recordatorios_log`) de cada envío (éxito/fallo)
- **Tabla auto-creada** si no existe (`CREATE TABLE IF NOT EXISTS`)

### ⚙️ Panel SaaS Admin (solo saas_owner)
- Lista de gimnasios registrados con estado de suscripción
- Extender suscripción de cada gimnasio (+1 mes)
- Crear nuevo gimnasio en la plataforma
- Verificación manual de suscripciones

### 📱 PWA (Progressive Web App)
- `manifest.json` completo con iconos SVG + PNG (192×192, 512×512 maskable)
- Service worker con **auto-update** y runtime caching para Google Fonts
- `apple-touch-icon` (180×180) para iOS
- Shortcuts: acceso directo a Miembros y Dashboard desde el menú contextual
- `display: standalone` + `display_override: window-controls-overlay`
- Script `scripts/generate-pwa-icons.mjs` que convierte SVG → PNG vía Sharp
- Archivo `_redirects` para SPA routing en Cloudflare Pages

---

## 🗄️ Estructura de la Base de Datos (11 tablas)

| Tabla | Descripción |
| :--- | :--- |
| `gyms` | Tenants (gimnasios) con control de suscripción (`fecha_vencimiento`, `suscripcion_activa`) |
| `users` | Usuarios con roles (`saas_owner`, `gym_owner`, `staff`) |
| `plans` | Planes de membresía por gimnasio (nombre, duración en días, precio) |
| `members` | Socios con fecha de vencimiento, opt-in WhatsApp y `activo` (baja lógica) |
| `member_metrics` | Historial de peso/altura/IMC de cada socio (con fecha) |
| `classes` | Clases con horarios (JSONB), instructor y capacidad |
| `class_enrollments` | Inscripciones de miembros a clases (con unique constraint `member_id + class_id`) |
| `member_payments` | Pagos de miembros al gimnasio |
| `saas_payments` | Pagos del gimnasio al SaaS (dueño de la plataforma) |
| `whatsapp_sessions` | Estado y datos de sesión de WhatsApp por gimnasio |
| `recordatorios_log` | Auditoría de recordatorios enviados por WhatsApp |

---

## 📁 Estructura del Proyecto

```
📁 raíz/
├── 📁 backend/
│   ├── 📄 api/index.js              ← Servidor Express (punto de entrada)
│   ├── 📁 src/
│   │   ├── 📁 config/db.js          ← Pool de PostgreSQL (Supabase)
│   │   ├── 📁 middleware/auth.js    ← JWT + verificación de roles/suscripción
│   │   ├── 📁 routes/
│   │   │   ├── auth.js              ← Login (POST /api/auth/login)
│   │   │   ├── dashboard.js         ← KPIs del panel
│   │   │   ├── members.js           ← CRUD miembros + métricas IMC
│   │   │   ├── classes.js           ← CRUD clases + inscripciones + miembros de clase
│   │   │   ├── payments.js          ← Registrar pagos + historial
│   │   │   ├── whatsapp.js          ← QR, pairing, status, logout
│   │   │   └── admin.js             ← Panel SaaS (solo saas_owner)
│   │   ├── 📁 services/
│   │   │   ├── recordatorios.js     ← Cron job + lógica de envío WhatsApp
│   │   │   └── suscripciones.js     ← Cron job + verificación de suscripciones SaaS
│   │   └── 📁 utils/
│   │       ├── whatsappManager.js   ← Baileys: socket, QR, pairing, envío
│   ├── 📁 sessions/                 ← Sesiones de WhatsApp (multi-file)
│   └── 📄 .env                      ← Config local (NO subir a git)
│
├── 📁 frontend/
│   ├── 📄 vite.config.js            ← Config PWA con VitePWA plugin
│   ├── 📄 index.html                ← Meta tags PWA + Google Fonts
│   ├── 📁 public/
│   │   ├── icon.svg                 ← Icono principal SVG
│   │   ├── favicon.svg              ← Favicon
│   │   ├── pwa-192x192.png          ← Icono PWA 192px
│   │   ├── pwa-512x512.png          ← Icono PWA 512px maskable
│   │   ├── apple-touch-icon.png     ← Icono iOS 180px
│   │   └── _redirects               ← SPA fallback para Cloudflare Pages
│   ├── 📁 src/
│   │   ├── 📄 App.jsx               ← Router con rutas protegidas
│   │   ├── 📄 main.jsx              ← Entry point
│   │   ├── 📁 components/
│   │   │   ├── 📁 layout/
│   │   │   │   ├── AppShell.jsx     ← Layout con sidebar + topbar
│   │   │   │   └── Sidebar.jsx      ← Menú navegación responsive
│   │   │   ├── 📁 ui/Modal.jsx      ← Modal reutilizable con Portal
│   │   │   └── ProtectedRoute.jsx   ← Guard de rutas + verificación suscripción
│   │   ├── 📁 contexts/AuthContext.jsx ← Estado global de autenticación
│   │   ├── 📁 pages/
│   │   │   ├── Login.jsx            ← Pantalla de inicio de sesión
│   │   │   ├── Dashboard.jsx        ← Panel con KPIs
│   │   │   ├── Members.jsx          ← Lista + crear/editar/eliminar miembro
│   │   │   ├── MemberDetail.jsx     ← Ficha con IMC e historial
│   │   │   ├── Classes.jsx          ← CRUD completo de clases + inscripciones
│   │   │   ├── Payments.jsx         ← Pagos + historial
│   │   │   ├── WhatsApp.jsx         ← Conexión WhatsApp + estado en vivo
│   │   │   ├── Admin.jsx            ← Panel SaaS
│   │   │   └── Suspended.jsx        ← Cuenta suspendida
│   │   ├── 📁 styles/
│   │   │   ├── global.css           ← Tokens CSS, reset, tipografía
│   │   │   ├── layout.css           ← Sidebar, topbar, grid, responsive
│   │   │   ├── components.css       ← Botones, cards, inputs, modales, tablas, responsive
│   │   │   └── pages.css            ← Estilos específicos (login, dashboard)
│   │   └── 📁 utils/api.js          ← Axios instance con interceptors
│   └── 📁 scripts/
│       └── generate-pwa-icons.mjs   ← Genera PNGs desde SVG (Sharp)
│
└── 📁 database/
    ├── schema.sql                   ← Definición completa de las 11 tablas
    └── seed_dev.sql                  ← Datos de prueba
```

---

## 🚀 Cómo Ejecutar Localmente

### Prerrequisitos
- **Node.js** v18+
- **PostgreSQL** (o cuenta gratuita en [Supabase](https://supabase.com))

### 1. Base de Datos
```bash
# Crea la BD y ejecuta el schema
createdb gym_db
psql -d gym_db -f database/schema.sql
psql -d gym_db -f database/seed_dev.sql
```

### 2. Backend
```bash
cd backend

# Crea archivo .env con:
DATABASE_URL=postgresql://user:pass@host:5432/gym_db
JWT_SECRET=tu_secreto_jwt
PORT=3001

npm install
npm run dev   # http://localhost:3001
```

### 3. Frontend
```bash
cd frontend

# Crea archivo .env.local con:
VITE_API_URL=http://localhost:3001/api

npm install
npm run dev   # http://localhost:5173
```

### Usuarios de prueba (seed)
| Email | Contraseña | Rol |
| :--- | :--- | :--- |
| `admin@elegantgym.com` | `123456` | saas_owner (acceso a todos los gyms) |
| `anthony@misgym.com` | `123456` | gym_owner (Elegant for Gym, gym_id=1) |
| `david@iron.com` | `123456` | gym_owner (Iron Temple, gym_id=2) |

---

## ⏭️ Próximos Pasos / Roadmap

### 🔜 Prioridad alta (despliegue)
1. **🌐 Desplegar Backend en Koyeb**
   - Subir backend a Koyeb (o Railway/Render)
   - Configurar variables de entorno de producción
   - El socket de WhatsApp necesita un servidor con soporte WebSocket (Koyeb sí lo soporta)

2. **🔗 Conectar Frontend con Backend en producción**
   - Actualizar `VITE_API_URL` en Cloudflare Pages con la URL del backend
   - Re-desplegar frontend

3. **🗄️ Migrar BD a producción**
   - Crear proyecto en Supabase (gratis)
   - Ejecutar schema.sql y seed_dev.sql en la BD de producción
   - Actualizar DATABASE_URL en el backend

### 🔜 Prioridad media
4. **📊 Vista de historial de recordatorios** — Página o sección donde se vean todos los mensajes enviados, a quién, estado y errores
5. **🧾 Reportes / Exportación** — Exportar lista de miembros a Excel/PDF y reporte de ingresos mensuales
6. **🔔 Más tipos de recordatorios WhatsApp** — Bienvenida al nuevo miembro, cumpleaños, promociones

### 🔜 Prioridad baja
7. **🌙 Modo claro / oscuro**
8. **🎨 Personalización de marca** — que cada gym pueda subir su logo y colores
9. **🤖 Chatbot simple** — para que los miembros consulten su saldo por WhatsApp

---

## 📄 API Endpoints

| Método | Ruta | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | ❌ | Iniciar sesión |
| `GET` | `/api/health` | ❌ | Healthcheck |
| `GET` | `/api/dashboard` | ✅ | KPIs del panel |
| `GET` | `/api/members` | ✅ | Lista de miembros (filtros: `search`, `status`) |
| `GET` | `/api/members/:id` | ✅ | Detalle de miembro + métricas + historial |
| `POST` | `/api/members` | ✅ | Crear miembro |
| `PUT` | `/api/members/:id` | ✅ | Actualizar miembro |
| `DELETE` | `/api/members/:id` | ✅ | Eliminar miembro (baja lógica con activo=false) |
| `POST` | `/api/members/:id/metrics` | ✅ | Registrar peso/altura (IMC auto) |
| `GET` | `/api/plans` | ✅ | Planes del gimnasio |
| `GET` | `/api/classes` | ✅ | Lista de clases con conteo de inscritos |
| `GET` | `/api/classes/:id/members` | ✅ | Miembros inscritos en una clase específica |
| `POST` | `/api/classes` | ✅ | Crear clase |
| `PUT` | `/api/classes/:id` | ✅ | Editar clase |
| `DELETE` | `/api/classes/:id` | ✅ | Eliminar clase |
| `POST` | `/api/classes/:id/enroll` | ✅ | Inscribir miembro |
| `DELETE` | `/api/classes/:id/enroll/:memberId` | ✅ | Desinscribir miembro |
| `GET` | `/api/payments` | ✅ | Historial de pagos + totales |
| `POST` | `/api/payments` | ✅ | Registrar pago (+extender membresía) |
| `GET` | `/api/whatsapp/qr` | ✅ | Generar QR para conectar WhatsApp |
| `POST` | `/api/whatsapp/pair` | ✅ | Generar código de vinculación (alternativa al QR) |
| `GET` | `/api/whatsapp/status` | ✅ | Estado de conexión WhatsApp |
| `POST` | `/api/whatsapp/logout` | ✅ | Desconectar WhatsApp |
| `GET` | `/api/admin/gyms` | ✅ (saas_owner) | Listar gimnasios |
| `POST` | `/api/admin/gyms` | ✅ (saas_owner) | Crear gimnasio |
| `POST` | `/api/admin/gyms/:id/payment` | ✅ (saas_owner) | Extender suscripción de gimnasio |

---

## 📐 Notas de Arquitectura

- **Multi-tenant:** Cada tabla de datos lleva `gym_id` para aislamiento entre gimnasios
- **Membresía auto-calculada:** Al registrar un pago, la fecha de vencimiento se extiende automáticamente según la duración del plan
- **Estado dinámico:** El estado del miembro (activo/por vencer/vencido) se calcula en SQL en tiempo real, no se almacena
- **WhatsApp persistente:** El socket de Baileys se mantiene en memoria (`activeConnections` Map). Si se cae, se reconecta automáticamente
- **Recordatorios con tabla auto-creada:** `recordatorios_log` se crea automáticamente si no existe al iniciar el backend
- **Suspensión SaaS:** Cron diario que revisa `fecha_vencimiento + 2 días de gracia` y desactiva gimnasios morosos
- **Modal responsive:** En móvil, el modal se pega arriba (`align-items: flex-start`) para que el teclado no tape el contenido