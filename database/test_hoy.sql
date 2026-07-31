-- =============================================================================
-- SCRIPT DE PRUEBA: Miembros que vencen HOY (31 de julio 2026)
-- Ejecutar: psql -d gym_db -f database/test_hoy.sql
-- =============================================================================

-- Miembro 1: Número externo (tercero) - +593 95 885 8193
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Socio Externo 1', 'externo1@test.com', '+593958858193', 1, '2026-07-01', '2026-07-31', true)
ON CONFLICT DO NOTHING;

-- Miembro 2: Dueño (Anthony) - 0999752932 → ya existe como Ana Martínez, solo actualizamos su fecha
UPDATE members 
SET fecha_vencimiento = '2026-07-31', opt_in_whatsapp = true
WHERE gym_id = 1 AND telefono = '+593999752932';

-- Miembro 3: Número externo (tercero) - 593 99 973 2274
INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
VALUES (1, 'Socio Externo 2', 'externo2@test.com', '+593999732274', 1, '2026-07-01', '2026-07-31', true)
ON CONFLICT DO NOTHING;

-- Verificar los miembros insertados
SELECT id, nombre, telefono, fecha_vencimiento, opt_in_whatsapp
FROM members 
WHERE gym_id = 1 AND fecha_vencimiento = '2026-07-31';