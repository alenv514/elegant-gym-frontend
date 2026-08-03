# 🏋️‍♂️ Elegant for Gym — Plataforma SaaS de Gestión y Automatización de Gimnasios

**Elegant for Gym** es una solución integral **Software as a Service (SaaS) Multi-tenant** diseñada para la gestión operativa, control de membresías, administración de clases y automatización de cobranzas de gimnasios independientes y centros deportivos.

Desarrollada y mantenida por **Alen**, la plataforma combina un diseño moderno en modo oscuro con un potente motor de inteligencia para la retención de socios mediante **notificaciones automáticas por WhatsApp**.

---

## 🌟 Propuesta de Valor

La deserción y el olvido en el pago de cuotas mensuales representa una pérdida del **30% al 40%** de los ingresos de un gimnasio. **Elegant for Gym** soluciona esto transformando la administración tradicional en un ecosistema automatizado y accesible desde cualquier dispositivo:

- 📱 **Automatización de Cobranza por WhatsApp:** Notificaciones oportunas de vencimiento enviadas automáticamente a los socios sin intervención manual.
- 📊 **Panel de Control en Tiempo Real:** Visualización instantánea de miembros activos, recaudación mensual, ingresos por método de pago y clases programadas.
- ⚡ **Experiencia PWA Instalable:** Funciona como aplicación nativa en celulares Android, iOS y computadoras de escritorio.
- 🛡️ **Arquitectura Multi-tenant Segura:** Aislamiento total de datos por gimnasio con control automático de suscripción y días de gracia.

---

## ⚡ Módulos y Funcionalidades Principales

### 1. 📊 Dashboard Administrativo
- Conteo en tiempo real de socios activos, clases disponibles e ingresos acumulados del mes.
- Indicador interactivo de **Pagos pendientes y por vencer**.
- Resumen de clases del día con cupos ocupados e instructores a cargo.
- Acceso directo rápido para registro de pagos y nuevos miembros.

### 2. 👥 Gestión Integral de Socios (CRM)
- **Control de Membresías:** Estados calculados dinámicamente (*Al día*, *Por vencer*, *Vencido*).
- **Ficha Médica y Evolución Física:** Registro de peso, altura e **Índice de Masa Corporal (IMC)** calculado automáticamente con historial y evolución.
- **WhatsApp Opt-in:** Control explícito de consentimiento para el envío de notificaciones.
- **Buscador Inteligente y Filtros:** Búsqueda rápida por nombre o estado.

### 3. 💬 Motor de Notificaciones Automáticas por WhatsApp
- **Recordatorio Automatizado Diarios (08:00 AM):** Notificación automática el día exacto de vencimiento de la membresía.
- **Dual Channel Integration:**
  - **Meta Cloud API Oficial:** Envíos a través de la infraestructura en la nube oficial de Meta.
  - **Conexión QR por Baileys:** Permite al gimnasio vincular su propio número de WhatsApp vía código QR para recibir respuestas directas en su celular.
- **Informe de Resumen al Propietario:** Reporte diario enviado al WhatsApp del dueño con la lista detallada de socios notificados.
- **Historial y Auditoría de Envíos:** Registro transparente del estado de entrega (`ENVIADO` / `FALLIDO`) visible desde la app.

### 4. 📅 Control de Clases e Inscripciones
- Programación de disciplinas (CrossFit, Yoga, Funcional, etc.), horarios, instructores y capacidad máxima.
- Indicador visual de ocupación (Verde / Amarillo / Rojo).
- Inscripción y desinscripción de socios en un clic con verificación de cupos.

### 5. 💳 Gestión de Pagos y Finanzas
- Registro de cobros manuales (Efectivo / Transferencia).
- **Renovación e incremento de vigencia inteligente:** Extensión acumulativa si la membresía está activa o cálculo desde el día actual si ya venció.
- Desglose y balance de ingresos por método de pago.

### 6. ⚙️ Panel de Administración SaaS (Superadmin)
- Control de gimnasios suscritos a la plataforma.
- Monitoreo de estados de suscripción, fecha de vencimiento y días de gracia.
- Extensión o suspensión automática de servicios por falta de pago.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Descripción / Servidor |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | Interfaz SPA responsive en Vanilla CSS (Dark Gold Theme) |
| **PWA** | VitePWA + Service Workers | Instalable como App nativa en Android, iOS y Windows |
| **Backend** | Node.js + Express | API RESTful con arquitectura modular y middlewares de seguridad |
| **Base de Datos** | PostgreSQL (Supabase / PG Pool) | Relacional multi-tenant con 11 tablas optimizadas e índices |
| **WhatsApp API** | Meta Cloud API v21.0 & Baileys | Integración dual oficial y WebSocket QR |
| **Despliegue** | Cloudflare Pages & Railway | Infraestructura cloud de alta disponibilidad 24/7 |

---

## 📁 Estructura del Proyecto

```
📁 raíz/
├── 📁 backend/
│   ├── 📁 api/index.js              ← Servidor Express (punto de entrada)
│   ├── 📁 src/
│   │   ├── 📁 config/db.js          ← Conexión PostgreSQL (Supabase)
│   │   ├── 📁 middleware/auth.js    ← Seguridad JWT y roles
│   │   ├── 📁 routes/               ← Endpoints REST (auth, members, classes, payments, whatsapp, admin)
│   │   ├── 📁 services/             ← Crons de recordatorios y suscripciones SaaS
│   │   └── 📁 utils/                ← Conectores WhatsApp (Meta API & Baileys)
│   └── 📄 .env                      ← Variables de entorno
│
├── 📁 frontend/
│   ├── 📁 public/                   ← Iconos PWA y manifiesto
│   ├── 📁 src/
│   │   ├── 📁 components/           ← Sidebar, Topbar, Modales y UI
│   │   ├── 📁 contexts/             ← Estado global de autenticación
│   │   ├── 📁 pages/                ← Vistas principales (Login, Dashboard, Members, Classes, Payments, WhatsApp, Admin)
│   │   └── 📁 styles/               ← Sistema de diseño CSS en modo oscuro
│   └── 📄 vite.config.js            ← Configuración PWA
│
├── 📁 database/
│   ├── 📄 schema.sql                ← Estructura de las 11 tablas del sistema
│   └── 📄 seed_dev.sql              ← Datos iniciales de prueba
│
└── 📄 LICENSE                       ← Licencia de Software Propietario (Alen)
```

---

## 🚀 Despliegue y Ejecución Local

### Prerrequisitos
- **Node.js** v18 o superior
- **PostgreSQL** o instancia activa en [Supabase](https://supabase.com)

### 1. Base de Datos
```bash
createdb gym_db
psql -d gym_db -f database/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
npm run dev   # Ejecuta en http://localhost:3001
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev   # Ejecuta en http://localhost:5173
```

---

## 🔒 Propiedad Intelectual y Licencia

Este proyecto es un **Software Propietario (All Rights Reserved)** desarrollado y administrado exclusivamente por **Alen**. 

La marca commercial *"Elegant for Gym"* corresponde a la denominación del gimnasio cliente contratante. El código fuente, diseño, arquitectura e infraestructura tecnológica son propiedad intelectual única del desarrollador. Consulte el archivo [`LICENSE`](./LICENSE) para mayores detalles.

---

**Desarrollado con excelencia por Alen.** 🚀