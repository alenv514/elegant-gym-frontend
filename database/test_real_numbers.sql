-- Script SQL para insertar 3 miembros reales con fecha de vencimiento HOY.
-- Copia este código y ejecútalo en el SQL Editor de Supabase.

INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES 
(1, 'Prueba Real 1', 'real1@mail.com', '+593999273600', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, true),
(1, 'Prueba Real 2', 'real2@mail.com', '+593987445342', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, true),
(1, 'Prueba Real 3', 'real3@mail.com', '+593992934115', (SELECT id FROM plans WHERE gym_id = 1 LIMIT 1), CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, true);
