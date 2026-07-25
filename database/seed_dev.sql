-- 1. INSERT DEMO GYM
INSERT INTO gyms (nombre, ciudad, email_contacto, suscripcion_activa, dias_gracia)
VALUES ('Elegant for Gym', 'Guayaquil', 'contacto@elegantgym.com', true, 2)
ON CONFLICT DO NOTHING;

-- 2. INSERT DEV USERS (Password is '123456' hashed with bcrypt)
-- Hashed '123456' -> $2a$10$wE3929iHqM46mN4aYt5/P.WkXk6/h5C5.xYnO5qC0sA1yD2yJ9TqS
INSERT INTO users (gym_id, nombre, email, password_hash, rol)
VALUES 
(NULL, 'Admin SaaS', 'admin@elegantgym.com', '$2a$10$wE3929iHqM46mN4aYt5/P.WkXk6/h5C5.xYnO5qC0sA1yD2yJ9TqS', 'saas_owner'),
(1, 'Carlos Mendoza', 'carlos@misgym.com', '$2a$10$wE3929iHqM46mN4aYt5/P.WkXk6/h5C5.xYnO5qC0sA1yD2yJ9TqS', 'gym_owner')
ON CONFLICT DO NOTHING;

-- 3. INSERT MEMBERSHIP PLANS FOR GYM 1
INSERT INTO plans (gym_id, nombre, precio, duracion_dias)
VALUES 
(1, 'Básico', 35.00, 30),
(1, 'Premium', 50.00, 30),
(1, 'Mensual', 40.00, 30)
ON CONFLICT DO NOTHING;

-- 4. INSERT DEMO MEMBERS FOR GYM 1
-- Vence en 15 días (Activo)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Ana Martínez', 'ana@mail.com', '+593999752932', 2, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', true);

-- Venció hace 3 días (Vencido)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Pedro Ruiz', 'pedro@mail.com', '+593999999999', 1, CURRENT_DATE - INTERVAL '33 days', CURRENT_DATE - INTERVAL '3 days', false);

-- Vence en exactamente 2 días (Por Vencer)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Laura Castro', 'laura@mail.com', '+593999888777', 2, CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE + INTERVAL '2 days', true);

-- 5. INSERT BODY METRICS HISTORY FOR ANA (Member 1)
-- Check calculation formulas in member_metrics: imc = peso / (altura * altura)
-- 68kg / (1.65 * 1.65) = 25.0
-- 62kg / (1.65 * 1.65) = 22.8
INSERT INTO member_metrics (member_id, gym_id, peso_kg, altura_m, imc, fecha)
VALUES 
(1, 1, 68.00, 1.65, 25.0, CURRENT_DATE - INTERVAL '6 months'),
(1, 1, 65.00, 1.65, 23.9, CURRENT_DATE - INTERVAL '4 months'),
(1, 1, 62.00, 1.65, 22.8, CURRENT_DATE - INTERVAL '1 month');

-- 6. INSERT DEMO CLASSES
INSERT INTO classes (gym_id, nombre, instructor, capacidad_max, horario, descripcion)
VALUES 
(1, 'CrossFit Matutino', 'Roberto Silva', 15, '[{"dia": "Lunes", "hora": "07:00"}, {"dia": "Miércoles", "hora": "07:00"}, {"dia": "Viernes", "hora": "07:00"}]', 'Clase de alta intensidad para empezar el día.'),
(1, 'Yoga & Stretching', 'María López', 10, '[{"dia": "Martes", "hora": "10:00"}, {"dia": "Jueves", "hora": "10:00"}]', 'Flexibilidad y relajación.'),
(1, 'Funcional Nocturno', 'Luis Herrera', 15, '[{"dia": "Lunes", "hora": "19:00"}, {"dia": "Martes", "hora": "19:00"}, {"dia": "Miércoles", "hora": "19:00"}, {"dia": "Jueves", "hora": "19:00"}, {"dia": "Viernes", "hora": "19:00"}]', 'Entrenamiento funcional por circuitos.');

-- 7. ENROLL MEMBERS IN CLASSES
INSERT INTO class_enrollments (class_id, member_id, gym_id)
VALUES 
(1, 1, 1), -- Ana en CrossFit
(2, 3, 1); -- Laura en Yoga

-- 8. INSERT PAYMENTS FOR MEMBERS
INSERT INTO member_payments (gym_id, member_id, monto, fecha_pago, metodo, notas)
VALUES 
(1, 1, 50.00, CURRENT_DATE - INTERVAL '15 days', 'Efectivo', 'Pago mensual de Ana'),
(1, 3, 50.00, CURRENT_DATE - INTERVAL '28 days', 'Transferencia', 'Pago mensual de Laura');
