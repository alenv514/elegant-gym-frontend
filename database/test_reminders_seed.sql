-- Inserción de 5 miembros de prueba con diferentes fechas para probar los mensajes de WhatsApp.
-- Puedes copiar este SQL y ejecutarlo en el editor de Supabase.
-- TIP: Reemplaza '+59399000000X' con tu propio número de teléfono real para recibir los mensajes en tu celular.

-- 1. Caso 1: Vence en exactamente 2 días (Debería recibir: POR_VENCER_2_DIAS)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Prueba Vence En 2 Dias', 'vence2dias@mail.com', '+593990000001', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE + INTERVAL '2 days', true);

-- 2. Caso 2: Vence HOY (Debería recibir: VENCE_HOY)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Prueba Vence Hoy', 'vencehoy@mail.com', '+593990000002', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, true);

-- 3. Caso 3: Venció ayer (Debería recibir: VENCIDO)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Prueba Vencio Ayer', 'vencioayer@mail.com', '+593990000003', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '31 days', CURRENT_DATE - INTERVAL '1 day', true);

-- 4. Caso 4: Miembro Activo normal (No recibe nada, vence en 15 días)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Prueba Activo Normal', 'activo@mail.com', '+593990000004', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', true);

-- 5. Caso 5: Miembro Vencido antiguo (No recibe nada, venció hace 5 días)
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Prueba Vencido Antiguo', 'vencidoantiguo@mail.com', '+593990000005', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE - INTERVAL '5 days', true);
