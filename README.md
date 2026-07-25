# Elegant for Gym — SaaS PWA 🏋️‍♂️✨

**Elegant for Gym** es una plataforma SaaS multi-tenant (marca blanca) para la gestión integral de gimnasios independientes y centros deportivos. Permite automatizar cobranzas, control de miembros, gestión de clases, métricas físicas (IMC) y envío de recordatorios automáticos por WhatsApp — todo con costo de infraestructura **$0 USD**.

---

## 🎯 ¿Por qué se creó esta app?

Los gimnasios independientes sufren dos problemas principales:
1. **Alta morosidad y deserción:** ~30-40% de los socios olvidan el vencimiento de su cuota mensual.
2. **Costos elevados de software:** El software tradicional cobra comisiones o tarifas mensuales inaccesibles.

**Elegant for Gym** resuelve esto con:
- **Automatización por WhatsApp:** Notificaciones de cobranza directamente al WhatsApp del socio sin APIs costosas.
- **Modelo SaaS $0 USD:** Construido sobre capas gratuitas de proveedores cloud.
- **Experiencia premium:** Interfaz elegante dorada/oscura, instalable como App nativa (PWA).

---

## 🛠️ Stack Tecnológico ($0 USD)

| Componente | Tecnología | Plataforma | Costo |
| :--- | :--- | :--- | :--- |
| **Frontend PWA** | React 18 + Vite + Workbox | Vercel | `$0` |
| **Backend REST API** | Node.js + Express + node-cron | Koyeb | `$0` |
| **Base de Datos** | PostgreSQL + 11 tablas | Supabase | `$0` |
| **WhatsApp** | @whiskeysockets/baileys | Backend | `$0` |

---

## 📦 Funcionalidades Completadas ✅

### 🔐 Autenticación y Roles
- **Login con JWT + bcrypt** (backend: `POST /api/auth/login`)
- **Interceptor axios** que redirige a `/login` si el token expira (401)
- **Roles:** `saas_owner` (acceso global) y `gym_owner` (solo su gimnasio)
- **Suspensión automática** por falta de pago de la cuota SaaS (403 con página `Suspended.jsx`)

### 📊 Dashboard (Panel General)
- Miembros activos totales (conteo real desde DB)
- Clases registradas en el sistema
- Pagos pendientes (por vencer o vencidos)
- Ingresos del mes (suma de `member_payments`)
- Lista de clases del día con instructores y cupos
- Miembros próximos a vencer (próximos 5 días)

### 👥 Miembros (CRUD Completo)
- **Lista** con buscador por nombre y filtros por estado (activo/por vencer/vencido)
- **Crear miembro** con selección de plan, fecha de inicio y opt-in WhatsApp
- **Editar miembro** (nombre, teléfono, email, plan) desde la ficha individual
- **Ficha individual** con:
  - Datos personales y plan contratado
  - Peso (kg) y altura (m) editables
  - **IMC calculado automáticamente** (`peso / altura²`) con clasificación médica
  - Clase asignada del día actual
  - **Historial de peso/altura/IMC** para ver evolución en el tiempo

### 📋 Clases (CRUD Completo)
- **Crear clase** con nombre, instructor, capacidad máxima, horarios (día + hora) y descripción
- **Editar clase** con modal precargado
- **Eliminar clase** con confirmación
- **Ver miembros** inscritos (lista de miembros del gym)
- **Barra de capacidad** visual (verde/amarillo/rojo según ocupación)
- **Inscripción/desinscripción** de miembros con validación de cupo

### 💰 Pagos
- **Registrar pago** manual (efectivo o transferencia) con selección de miembro
- **Extensión automática** de la membresía: si está vencida, se extiende desde hoy; si está activa, se acumula
- **Historial completo** con totales por método de pago
- Desglose visual: total histórico / efectivo / transferencia

### 📱 WhatsApp
- **Conexión por código QR** + refresco automático
- **Código de vinculación** (pairing code) — alternativa al QR, ingresas un código de 8 dígitos en WhatsApp
- **Indicador de estado** en tiempo real con polling (🔴 Desconectado / 🟢 Conectado)
- **Desconexión** segura con limpieza de sesión
- **Estabilidad:** Manejo de `restartRequired`, `loggedOut`, `badSession`, rate limiting (429)

### 🤖 Recordatorios Automáticos (Cron Job)
- **Cron diario a las 09:00 AM** usando `node-cron`
- Envía WhatsApp a miembros cuya membresía **vence en exactamente 2 días**
- Envía WhatsApp a miembros con membresía **vencida hace exactamente 1 día**
- Solo a miembros con `opt_in_whatsapp = true`
- **Registro en DB** (`recordatorios_log`) de cada envío (éxito/fallo)
- **Botón de prueba** desde el frontend para ejecutar al instante
- **Tabla auto-creada** si no existe (`CREATE TABLE IF NOT EXISTS`)

### ⚙️ Panel SaaS Admin (solo saas_owner)
- Lista de gimnasios registrados
- Extender suscripción de cada gimnasio (+1 mes)
- Crear nuevo gimnasio en la plataforma

### 📱 PWA (Progressive Web App)
- `manifest.json` completo con iconos SVG + PNG (192×192, 512×512 maskable)
- Service worker con **auto-update** y runtime caching para Google Fonts
- `apple-touch-icon` (180×180) para iOS
- Shortcuts: acceso directo a Miembros y Dashboard desde el menú contextual
- `display: standalone` + `display_override: window-controls-overlay`
- Script `scripts/generate-pwa-icons.mjs` que convierte SVG → PNG vía Sharp

---

## 🗄️ Estructura de la Base de Datos (11 tablas)

| Tabla | Descripción |
| :--- | :--- |
| `gyms` | Tenants (gimnasios) con control de suscripción |
| `users` | Usuarios con roles (`saas_owner`, `gym_owner`, `staff`) |
| `plans` | Planes de membresía por gimnasio |
| `members` | Socios con fecha de vencimiento y opt-in WhatsApp |
| `member_metrics` | Historial de peso/altura/IMC de cada socio |
| `classes` | Clases con horarios (JSONB), instructor y capacidad |
| `class_enrollments` | Inscripciones de miembros a clases (con unique constraint) |
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
│   │   │   ├── classes.js           ← CRUD clases + inscripciones
│   │   │   ├── payments.js          ← Registrar pagos + historial
│   │   │   ├── whatsapp.js          ← QR, pairing, status, logout
│   │   │   ├── admin.js             ← Panel SaaS (solo saas_owner)
│   │   │   ├── recordatorios.js     ← Endpoint de prueba de recordatorios
│   │   ├── 📁 services/
│   │   │   └── recordatorios.js     ← Cron job + lógica de recordatorios
│   │   └── 📁 utils/
│   │       ├── whatsappManager.js   ← Baileys: socket, QR, pairing, envío
│   ├── 📁 sessions/                 ← Sesiones de WhatsApp (multi-file)
│   └── 📁 scratch/                  ← Scripts de mantenimiento
│
├── 📁 frontend/
│   ├── 📄 vite.config.js            ← Config PWA con VitePWA plugin
│   ├── 📄 index.html                ← Meta tags PWA + Google Fonts
│   ├── 📁 public/
│   │   ├── icon.svg                 ← Icono principal SVG
│   │   ├── favicon.svg              ← Favicon
│   │   ├── pwa-192x192.png          ← Icono PWA 192px
│   │   ├── pwa-512x512.png          ← Icono PWA 512px maskable
│   │   └── apple-touch-icon.png     ← Icono iOS 180px
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
│   │   │   ├── Members.jsx          ← Lista + crear miembro
│   │   │   ├── MemberDetail.jsx     ← Ficha con IMC e historial
│   │   │   ├── Classes.jsx          ← CRUD completo de clases
│   │   │   ├── Payments.jsx         ← Pagos + historial
│   │   │   ├── WhatsApp.jsx         ← Conexión WhatsApp + test recordatorios
│   │   │   ├── Admin.jsx            ← Panel SaaS
│   │   │   └── Suspended.jsx        ← Cuenta suspendida
│   │   ├── 📁 styles/
│   │   │   ├── global.css           ← Tokens CSS, reset, tipografía
│   │   │   ├── layout.css           ← Sidebar, topbar, grid, responsive
│   │   │   ├── components.css       ← Botones, cards, inputs, modales, tablas
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
# DATABASE_URL=postgresql://user:pass@host:5432/gym_db
# JWT_SECRET=tu_secreto_jwt
# PORT=3001

npm install
npm run dev   # http://localhost:3001
```

### 3. Frontend
```bash
cd frontend

# Crea archivo .env con:
# VITE_API_URL=http://localhost:3001/api

npm install
npm run dev   # http://localhost:5173
```

### Usuarios de prueba (seed)
| Email | Contraseña | Rol |
| :--- | :--- | :--- |
| `admin@elegantgym.com` | `admin123` | saas_owner |
| `david@iron.com` | `owner123` | gym_owner (Iron Temple → Elegant for Gym) |

---

## ⏭️ Próximos Pasos / Roadmap

### 🔜 Prioridad alta
1. **🌐 Despliegue a producción:**
   - Frontend en **Vercel** (conectar repo, configurar env vars)
   - Backend en **Koyeb** (dockerizar o deploy directo, mantener socket WhatsApp)
   - Base de datos en **Supabase** (ya está lista)

2. **📊 Vista de historial de recordatorios:**
   - Página o sección donde se vean todos los mensajes enviados, a quién, estado, errores

### 🔜 Prioridad media
3. **⏰ Suspensión automática SaaS:**
   - Cron a las 00:05 AM que marque `suscripcion_activa = false` en gimnasios con `fecha_vencimiento < CURRENT_DATE`

4. **🧾 Reportes / Exportación**:
   - Exportar lista de miembros a Excel/PDF
   - Reporte de ingresos mensuales

5. **🔔 Más tipos de recordatorios WhatsApp:**
   - Bienvenida al nuevo miembro
   - Felicitaciones por cumpleaños
   - Promociones / eventos

### 🔜 Prioridad baja
6. **🌙 Modo claro / oscuro**
7. **🎨 Personalización de marca:** que cada gym pueda subir su logo y colores
8. **🤖 Chatbot simple para que los miembros consulten su saldo por WhatsApp**

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
| `DELETE` | `/api/members/:id` | ✅ | Eliminar miembro |
| `POST` | `/api/members/:id/metrics` | ✅ | Registrar peso/altura (IMC auto) |
| `GET` | `/api/plans` | ✅ | Planes del gimnasio |
| `GET` | `/api/classes` | ✅ | Lista de clases con conteo de inscritos |
| `POST` | `/api/classes` | ✅ | Crear clase |
| `PUT` | `/api/classes/:id` | ✅ | Editar clase |
| `DELETE` | `/api/classes/:id` | ✅ | Eliminar clase |
| `POST` | `/api/classes/:id/enroll` | ✅ | Inscribir miembro |
| `DELETE` | `/api/classes/:id/enroll/:memberId` | ✅ | Desinscribir miembro |
| `GET` | `/api/payments` | ✅ | Historial de pagos |
| `POST` | `/api/payments` | ✅ | Registrar pago (+extender membresía) |
| `GET` | `/api/whatsapp/qr` | ✅ | Generar QR para conectar WhatsApp |
| `POST` | `/api/whatsapp/pair` | ✅ | Generar código de vinculación |
| `GET` | `/api/whatsapp/status` | ✅ | Estado de conexión WhatsApp |
| `POST` | `/api/whatsapp/logout` | ✅ | Desconectar WhatsApp |
| `GET` | `/api/admin/gyms` | ✅ (saas_owner) | Listar gimnasios |
| `POST` | `/api/admin/gyms` | ✅ (saas_owner) | Crear gimnasio |
| `POST` | `/api/admin/gyms/:id/payment` | ✅ (saas_owner) | Extender suscripción de gimnasio |
| `POST` | `/api/recordatorios/test` | ✅ | Ejecutar recordatorios manualmente |

---

## 📸 Scripts de Mantenimiento

| Script | Propósito |
| :--- | :--- |
| `backend/scratch/preparar-prueba-recordatorios.js` | Ajusta fechas de miembros para probar recordatorios (2 días antes / 1 día después) |
| `frontend/scripts/generate-pwa-icons.mjs` | Genera PNGs (192×192, 512×512, 180×180) desde el SVG del logo |

---

## 📐 Notas de Arquitectura

- **Multi-tenant:** Cada tabla de datos lleva `gym_id` para aislamiento entre gimnasios
- **Membresía auto-calculada:** Al registrar un pago, la fecha de vencimiento se extiende automáticamente según la duración del plan
- **Estado dinámico:** El estado del miembro (activo/por vencer/vencido) se calcula en SQL en tiempo real, no se almacena
- **WhatsApp persistente:** El socket de Baileys se mantiene en memoria (`activeConnections` Map). Si se cae, se reconecta automáticamente
- **Recordatorios con tabla auto-creada:** `recordatorios_log` se crea automáticamente si no existe al iniciar el backend
