import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../config/db.js'
import { calcularVencimiento } from '../utils/fechas.js'
import { procesarGimnasio } from '../services/recordatorios.js'

const router = express.Router()

// Force auth on all member routes
router.use(authenticateToken)

/**
 * GET /api/members
 * Lists all members for the authenticated gym with search and status filters.
 */
router.get('/', async (req, res) => {
  const gymId = req.user.gym_id
  const { search, status } = req.query

  try {
    let sql = `
      SELECT m.id, m.nombre, m.email, m.telefono, m.fecha_inicio, m.fecha_vencimiento, m.opt_in_whatsapp,
             p.nombre as plan_nombre,
             CASE 
               WHEN m.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
               WHEN m.fecha_vencimiento <= CURRENT_DATE + INTERVAL '2 days' THEN 'por_vencer'
               ELSE 'activo'
             END as estado
      FROM members m
      LEFT JOIN plans p ON m.plan_id = p.id
      WHERE m.gym_id = $1
    `
    const params = [gymId]
    let paramIndex = 2

    // Search filter
    if (search) {
      sql += ` AND m.nombre ILIKE $${paramIndex}`
      params.push(`%${search}%`)
      paramIndex++
    }

    // Status filter
    if (status && status !== 'todos') {
      sql += ` AND (
        CASE 
          WHEN m.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
          WHEN m.fecha_vencimiento <= CURRENT_DATE + INTERVAL '2 days' THEN 'por_vencer'
          ELSE 'activo'
        END
      ) = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    sql += ' ORDER BY m.nombre ASC'

    const membersRes = await query(sql, params)
    return res.json(membersRes.rows)
  } catch (err) {
    console.error('Error fetching members:', err)
    return res.status(500).json({ error: 'Error al obtener lista de miembros' })
  }
})

/**
 * GET /api/members/:id
 * Fetches details of a single member, their active metric, metrics history, and enrolled class.
 */
router.get('/:id', async (req, res) => {
  const gymId = req.user.gym_id
  const memberId = req.params.id

  try {
    // 1. Get member details
    const memberRes = await query(
      `SELECT m.id, m.nombre, m.email, m.telefono, m.fecha_inicio, m.fecha_vencimiento, m.opt_in_whatsapp, m.plan_id,
              p.nombre as plan_nombre,
              CASE 
                WHEN m.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
                WHEN m.fecha_vencimiento <= CURRENT_DATE + INTERVAL '2 days' THEN 'por_vencer'
                ELSE 'activo'
              END as estado
       FROM members m
       LEFT JOIN plans p ON m.plan_id = p.id
       WHERE m.id = $1 AND m.gym_id = $2`,
      [memberId, gymId]
    )

    const member = memberRes.rows[0]

    if (!member) {
      return res.status(404).json({ error: 'Miembro no encontrado' })
    }

    // 2. Fetch body metrics history
    const metricsRes = await query(
      `SELECT id, peso_kg, altura_m, imc, fecha 
       FROM member_metrics 
       WHERE member_id = $1 AND gym_id = $2
       ORDER BY fecha DESC`,
      [memberId, gymId]
    )

    // 3. Get enrolled classes for today
    const classRes = await query(
      `SELECT c.nombre, c.horario 
       FROM class_enrollments ce
       JOIN classes c ON ce.class_id = c.id
       WHERE ce.member_id = $1 AND ce.gym_id = $2`,
      [memberId, gymId]
    )

    // Structure response
    const metrics = metricsRes.rows
    const currentMetrics = metrics[0] || null

    return res.json({
      ...member,
      peso: currentMetrics ? Number(currentMetrics.peso_kg) : null,
      altura: currentMetrics ? Number(currentMetrics.altura_m) : null,
      imc: currentMetrics ? Number(currentMetrics.imc) : null,
      claseHoy: classRes.rows[0] ? `${classRes.rows[0].nombre}` : 'Sin clase asignada hoy',
      historial: metrics.map(h => ({
        fecha: h.fecha,
        peso: Number(h.peso_kg),
        altura: Number(h.altura_m),
        imc: Number(h.imc)
      }))
    })
  } catch (err) {
    console.error('Error fetching member detail:', err)
    return res.status(500).json({ error: 'Error al obtener detalle del miembro' })
  }
})

/**
 * POST /api/members
 * Registers a new member. Calculates expiration date automatically based on the chosen plan duration.
 */
router.post('/', async (req, res) => {
  const gymId = req.user.gym_id
  const { nombre, email, telefono, plan_id, fecha_inicio, opt_in_whatsapp } = req.body

  if (!nombre || !telefono || !plan_id) {
    return res.status(400).json({ error: 'Nombre, teléfono y plan son requeridos' })
  }

  try {
    // 1. Fetch plan duration to calculate vencimiento date
    const planRes = await query('SELECT duracion_dias FROM plans WHERE id = $1 AND gym_id = $2', [plan_id, gymId])
    const plan = planRes.rows[0]

    if (!plan) {
      return res.status(400).json({ error: 'El plan seleccionado no existe o no pertenece a tu gimnasio' })
    }

    const start = fecha_inicio ? new Date(fecha_inicio) : new Date()
    const vencimiento = calcularVencimiento(start, plan.duracion_dias)

    // 2. Insert member
    const newMemberRes = await query(
      `INSERT INTO members (gym_id, nombre, email, telefono, plan_id, fecha_inicio, fecha_vencimiento, opt_in_whatsapp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nombre, fecha_inicio, fecha_vencimiento`,
      [gymId, nombre, email || null, telefono, plan_id, start, vencimiento, opt_in_whatsapp || false]
    )

    return res.status(201).json(newMemberRes.rows[0])
  } catch (err) {
    console.error('Error creating member:', err)
    return res.status(500).json({ error: 'Error al crear miembro' })
  }
})

/**
 * PUT /api/members/:id
 * Updates member personal details or plans.
 */
router.put('/:id', async (req, res) => {
  const gymId = req.user.gym_id
  const memberId = req.params.id
  const { nombre, email, telefono, plan_id, fecha_vencimiento, opt_in_whatsapp } = req.body

  try {
    // Verify member belongs to this gym
    const memberCheck = await query('SELECT id FROM members WHERE id = $1 AND gym_id = $2', [memberId, gymId])
    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado' })
    }

    // Update table dynamically
    const fields = []
    const params = [memberId, gymId]
    let paramIndex = 3

    if (nombre) { fields.push(`nombre = $${paramIndex}`); params.push(nombre); paramIndex++ }
    if (email !== undefined) { fields.push(`email = $${paramIndex}`); params.push(email || null); paramIndex++ }
    if (telefono) { fields.push(`telefono = $${paramIndex}`); params.push(telefono); paramIndex++ }
    if (plan_id) { fields.push(`plan_id = $${paramIndex}`); params.push(plan_id); paramIndex++ }
    if (fecha_vencimiento) { fields.push(`fecha_vencimiento = $${paramIndex}`); params.push(fecha_vencimiento); paramIndex++ }
    if (opt_in_whatsapp !== undefined) { fields.push(`opt_in_whatsapp = $${paramIndex}`); params.push(opt_in_whatsapp); paramIndex++ }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar' })
    }

    const sql = `UPDATE members SET ${fields.join(', ')} WHERE id = $1 AND gym_id = $2 RETURNING *`
    const updateRes = await query(sql, params)

    return res.json(updateRes.rows[0])
  } catch (err) {
    console.error('Error updating member:', err)
    return res.status(500).json({ error: 'Error al actualizar datos del miembro' })
  }
})

/**
 * POST /api/members/:id/metrics
 * Logs a new biometric entry (weight, height) and auto-calculates the IMC.
 */
router.post('/:id/metrics', async (req, res) => {
  const gymId = req.user.gym_id
  const memberId = req.params.id
  const { peso_kg, altura_m, fecha } = req.body

  if (!peso_kg || !altura_m) {
    return res.status(400).json({ error: 'Peso (kg) y altura (m) son campos obligatorios' })
  }

  try {
    // Verify member exists
    const memberCheck = await query('SELECT id FROM members WHERE id = $1 AND gym_id = $2', [memberId, gymId])
    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado' })
    }

    // Auto-calculate IMC = peso / altura^2
    const peso = Number(peso_kg)
    const altura = Number(altura_m)
    const imc = +(peso / (altura * altura)).toFixed(1)

    const newMetricRes = await query(
      `INSERT INTO member_metrics (member_id, gym_id, peso_kg, altura_m, imc, fecha)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [memberId, gymId, peso, altura, imc, fecha || new Date()]
    )

    return res.status(201).json(newMetricRes.rows[0])
  } catch (err) {
    console.error('Error adding metrics:', err)
    return res.status(500).json({ error: 'Error al registrar métricas corporales' })
  }
})

/**
 * POST /api/members/recordatorios
 * Manually triggers WhatsApp reminders for memberships that are:
 * - Expiring in 2 days
 * - Expiring today
 * - Expired 1 day ago
 */
router.post('/recordatorios', async (req, res) => {
  try {
    const gym = {
      id: req.user.gym_id,
      nombre: req.user.gym_nombre || 'Tu gimnasio'
    }

    console.log(`🧪 Recordatorio manual solicitado por ${req.user.nombre} para: ${gym.nombre}`)
    const resumen = await procesarGimnasio(gym)

    return res.json({
      success: true,
      resumen: {
        por_vencer: resumen.por_vencer.enviados,
        vence_hoy: resumen.vence_hoy.enviados,
        vencidos: resumen.vencidos.enviados,
        total: resumen.por_vencer.enviados + resumen.vence_hoy.enviados + resumen.vencidos.enviados,
        fallidos: resumen.por_vencer.fallidos + resumen.vence_hoy.fallidos + resumen.vencidos.fallidos
      }
    })
  } catch (err) {
    console.error('Error al ejecutar recordatorios manuales:', err)
    return res.status(500).json({ error: 'Error al enviar recordatorios' })
  }
})

/**
 * DELETE /api/members/:id
 * Removes a member.
 */
router.delete('/:id', async (req, res) => {
  const gymId = req.user.gym_id
  const memberId = req.params.id

  try {
    const deleteRes = await query('DELETE FROM members WHERE id = $1 AND gym_id = $2 RETURNING id', [memberId, gymId])
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado' })
    }
    return res.json({ success: true, message: 'Miembro eliminado correctamente' })
  } catch (err) {
    console.error('Error deleting member:', err)
    return res.status(500).json({ error: 'Error al eliminar miembro' })
  }
})

export default router
