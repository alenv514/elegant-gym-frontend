-- Script SQL para insertar 5 miembros de prueba preparados para MAÑANA a las 09:00 AM.
-- Copia este código y ejecútalo en el SQL Editor de Supabase.
-- TIP: Reemplaza los teléfonos '+59399000000X' por números reales si quieres recibir los mensajes en tu celular.

-- 1. Mañana recibirá: POR_VENCER_2_DIAS (Vence el 31 de Julio)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Manana Vence En 2 Dias', 'vence2dias_m@mail.com', '+593990000001', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '27 days', CURRENT_DATE + INTERVAL '3 days', true);

-- 2. Mañana recibirá: VENCE_HOY (Vence el 29 de Julio - Mañana)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Manana Vence Hoy', 'vencehoy_m@mail.com', '+593990000002', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE + INTERVAL '1 day', true);

-- 3. Mañana recibirá: VENCIDO (Vence el 28 de Julio - Hoy)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Manana Vencido Ayer', 'vencioayer_m@mail.com', '+593990000003', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, true);

-- 4. Mañana NO recibirá nada (Membresía activa normal - Vence el 10 de Agosto)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Manana Activo Normal', 'activo_m@mail.com', '+593990000004', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '13 days', true);

-- 5. Mañana NO recibirá nada (Expirado antiguo - Venció el 20 de Julio)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Manana Vencido Antiguo', 'vencidoantiguo_m@mail.com', '+593990000005', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '38 days', CURRENT_DATE - INTERVAL '8 days', true);
