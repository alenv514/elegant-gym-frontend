-- 1. GYMS (Tenants)
CREATE TABLE gyms (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100),
    email_contacto VARCHAR(100) UNIQUE NOT NULL,
    suscripcion_activa BOOLEAN DEFAULT TRUE,
    dias_gracia INT DEFAULT 2,
    fecha_ultimo_pago DATE DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS (SaaS owner, gym owners & staff)
CREATE TYPE user_role AS ENUM ('saas_owner', 'gym_owner', 'staff');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    gym_id INT REFERENCES gyms(id) ON DELETE CASCADE, -- NULL if saas_owner
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol user_role NOT NULL DEFAULT 'gym_owner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PLANS (Membership plans offered by each gym)
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    gym_id INT REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    precio NUMERIC(10, 2) NOT NULL,
    duracion_dias INT NOT NULL DEFAULT 30
);

-- 4. MEMBERS (Socio details)
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    gym_id INT REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20) NOT NULL,
    plan_id INT REFERENCES plans(id) ON DELETE SET NULL,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    opt_in_whatsapp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. MEMBER METRICS (Body metrics history)
CREATE TABLE member_metrics (
    id SERIAL PRIMARY KEY,
    member_id INT REFERENCES members(id) ON DELETE CASCADE NOT NULL,
    gym_id INT REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
    peso_kg NUMERIC(5, 2) NOT NULL,
    altura_m NUMERIC(3, 2) NOT NULL,
    imc NUMERIC(4, 1) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 6. CLASSES (Schedules)
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    gym_id INT REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    instructor VARCHAR(100),
    capacidad_max INT NOT NULL DEFAULT 20,
    horario JSONB NOT NULL, -- Array of {dia: "Lunes", hora: "07:00"}
    descripcion TEXT
);

-- 7. CLASS ENROLLMENTS
CREATE TABLE class_enrollments (
    id SERIAL PRIMARY KEY,
    class_id INT REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    member_id INT REFERENCES members(id) ON DELETE CASCADE NOT NULL,
    gym_id INT REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
    fecha_inscripcion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_member_class UNIQUE(class_id, member_id)
);

-- 8. MEMBER PAYMENTS (Payments made by gym members to the gym)
CREATE TABLE member_payments (
    id SERIAL PRIMARY KEY,
    gym_id INT REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    monto NUMERIC(10, 2) NOT NULL,
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
    metodo VARCHAR(50) NOT NULL, -- e.g., 'Efectivo', 'Transferencia'
    notas TEXT
);

-- 9. SAAS PAYMENTS (Payments made by gym owners to the SaaS)
CREATE TABLE saas_payments (
    id SERIAL PRIMARY KEY,
    gym_id INT REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
    monto NUMERIC(10, 2) NOT NULL,
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
    periodo_cubierto_inicio DATE NOT NULL,
    periodo_cubierto_fin DATE NOT NULL,
    notas TEXT
);

-- 10. WHATSAPP SESSIONS (Baileys credentials per gym)
CREATE TABLE whatsapp_sessions (
    gym_id INT PRIMARY KEY REFERENCES gyms(id) ON DELETE CASCADE,
    estado_conexion VARCHAR(20) NOT NULL DEFAULT 'DESCONECTADO', -- DESCONECTADO, GENERANDO_QR, CONECTADO
    numero_telefono VARCHAR(20),
    session_data JSONB, -- All keys & credentials from Baileys serialized
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. RECORDATORIOS LOG (Audit logs for sent reminders)
CREATE TYPE reminder_type AS ENUM ('POR_VENCER_2_DIAS', 'VENCE_HOY', 'VENCIDO');
CREATE TYPE reminder_status AS ENUM ('ENVIADO', 'FALLIDO');

CREATE TABLE recordatorios_log (
    id SERIAL PRIMARY KEY,
    gym_id INT REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
    member_id INT REFERENCES members(id) ON DELETE CASCADE NOT NULL,
    tipo reminder_type NOT NULL,
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado reminder_status NOT NULL,
    mensaje TEXT,
    error_msg TEXT
);

-- 12. INDEXES FOR PERFORMANCE AND TENANT ISOLATION
CREATE INDEX idx_members_gym ON members(gym_id);
CREATE INDEX idx_metrics_member ON member_metrics(member_id);
CREATE INDEX idx_payments_gym ON member_payments(gym_id);
CREATE INDEX idx_enrollments_gym ON class_enrollments(gym_id);
