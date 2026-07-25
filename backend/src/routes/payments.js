import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../config/db.js'
import { calcularVencimiento } from '../utils/fechas.js'

const router = express.Router()

router.use(authenticateToken)

/**
 * GET /api/payments
 * Fetches member payments history for the authenticated gym.
 */
router.get('/', async (req, res) => {
  const gymId = req.user.gym_id

  try {
    const paymentsRes = await query(
      `SELECT mp.id, mp.monto, mp.fecha_pago, mp.metodo, mp.notas,
              m.nombre as miembro_nombre, p.nombre as plan_nombre
       FROM member_payments mp
       JOIN members m ON mp.member_id = m.id
       LEFT JOIN plans p ON m.plan_id = p.id
       WHERE mp.gym_id = $1
       ORDER BY mp.fecha_pago DESC, mp.id DESC`,
      [gymId]
    )
    return res.json(paymentsRes.rows)
  } catch (err) {
    console.error('Error fetching payments:', err)
    return res.status(500).json({ error: 'Error al obtener historial de pagos' })
  }
})

/**
 * POST /api/payments
 * Registers a manual payment. 
 * Automatically extends the member's subscription expiration date based on their plan's duration.
 */
router.post('/', async (req, res) => {
  const gymId = req.user.gym_id
  const { member_id, monto, metodo, notas } = req.body

  if (!member_id || !monto || !metodo) {
    return res.status(400).json({ error: 'ID de miembro, monto y método de pago son requeridos' })
  }

  try {
    // 1. Verify member exists and retrieve their active plan duration details
    const memberRes = await query(
      `SELECT m.id, m.fecha_vencimiento, m.plan_id, p.duracion_dias
       FROM members m
       LEFT JOIN plans p ON m.plan_id = p.id
       WHERE m.id = $1 AND m.gym_id = $2`,
      [member_id, gymId]
    )

    const member = memberRes.rows[0]

    if (!member) {
      return res.status(404).json({ error: 'Miembro no encontrado' })
    }

    if (!member.plan_id) {
      return res.status(400).json({ error: 'El miembro no tiene un plan de membresía asignado. Asigna uno antes de registrar pagos.' })
    }

    // 2. Calculate the new expiration date.
    // If the membership is already expired, extend starting from CURRENT_DATE.
    // If it is still active, extend starting from the existing fecha_vencimiento (stacking).
    const currentVencimiento = new Date(member.fecha_vencimiento)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let baseDate = currentVencimiento < today ? today : currentVencimiento
    
    const newVencimiento = calcularVencimiento(baseDate, member.duracion_dias)

    // 3. Register the payment in member_payments
    await query(
      `INSERT INTO member_payments (gym_id, member_id, monto, metodo, notas, fecha_pago)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
      [gymId, member_id, monto, metodo, notas || null]
    )

    // 4. Update the member's expiration date in members
    await query(
      'UPDATE members SET fecha_vencimiento = $1 WHERE id = $2 AND gym_id = $3',
      [newVencimiento, member_id, gymId]
    )

    return res.status(201).json({ 
      success: true, 
      message: 'Pago registrado y membresía extendida correctamente',
      nueva_fecha_vencimiento: newVencimiento
    })
  } catch (err) {
    console.error('Error registering payment:', err)
    return res.status(500).json({ error: 'Error al registrar el pago' })
  }
})

export default router
