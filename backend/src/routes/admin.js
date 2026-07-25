import express from 'express'
import { authenticateToken, authorizeRoles } from '../middleware/auth.js'
import { query } from '../config/db.js'

const router = express.Router()

// Enforce authentication AND saas_owner role authorization for ALL routes in this file
router.use(authenticateToken)
router.use(authorizeRoles('saas_owner'))

/**
 * GET /api/admin/gyms
 * Lists all gyms in the SaaS platform with their payment statuses.
 */
router.get('/gyms', async (req, res) => {
  try {
    const gymsRes = await query(
      `SELECT id, nombre, email_contacto, ciudad, suscripcion_activa, 
              fecha_ultimo_pago, fecha_vencimiento, created_at
       FROM gyms
       ORDER BY nombre ASC`
    )
    return res.json(gymsRes.rows)
  } catch (err) {
    console.error('Error fetching admin gyms:', err)
    return res.status(500).json({ error: 'Error al obtener la lista de gimnasios' })
  }
})

/**
 * POST /api/admin/gyms/:id/payment
 * Marks a gym subscription as paid.
 * Extends their expiration date by 1 month and marks subscription_activa as true.
 */
router.post('/gyms/:id/payment', async (req, res) => {
  const gymId = req.params.id
  const { monto, notas } = req.body

  try {
    // 1. Verify gym exists
    const gymCheck = await query(
      'SELECT id, fecha_vencimiento, suscripcion_activa FROM gyms WHERE id = $1',
      [gymId]
    )

    const gym = gymCheck.rows[0]

    if (!gym) {
      return res.status(404).json({ error: 'Gimnasio no encontrado' })
    }

    // 2. Calculate new expiration date (extend 1 month starting from current vencimiento or today, whichever is greater)
    const currentVencimiento = new Date(gym.fecha_vencimiento)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let baseDate = currentVencimiento < today ? today : currentVencimiento
    
    const newVencimiento = new Date(baseDate)
    newVencimiento.setMonth(newVencimiento.getMonth() + 1)

    // 3. Register payment in saas_payments table for audit trails
    await query(
      `INSERT INTO saas_payments (gym_id, monto, fecha_pago, periodo_cubierto_inicio, periodo_cubierto_fin, notas)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)`,
      [gymId, monto || 599.00, baseDate, newVencimiento, notas || 'Pago mensual recibido por transferencia bancaria']
    )

    // 4. Update the gym status to active and extend the expiration date
    const updateRes = await query(
      `UPDATE gyms 
       SET suscripcion_activa = true, 
           fecha_ultimo_pago = CURRENT_DATE, 
           fecha_vencimiento = $1 
       WHERE id = $2 
       RETURNING id, nombre, suscripcion_activa, fecha_vencimiento`,
      [newVencimiento, gymId]
    )

    return res.json({
      success: true,
      message: 'Pago del gimnasio registrado. Cuenta reactivada.',
      gym: updateRes.rows[0]
    })
  } catch (err) {
    console.error('Error marking gym payment:', err)
    return res.status(500).json({ error: 'Error al registrar el pago del gimnasio' })
  }
})

/**
 * POST /api/admin/gyms
 * Creates/registers a new gym (tenant) on the platform.
 */
router.post('/gyms', async (req, res) => {
  const { nombre, email_contacto, ciudad } = req.body

  if (!nombre || !email_contacto) {
    return res.status(400).json({ error: 'Nombre y email de contacto son obligatorios' })
  }

  try {
    const newGymRes = await query(
      `INSERT INTO gyms (nombre, email_contacto, ciudad, suscripcion_activa, fecha_ultimo_pago, fecha_vencimiento)
       VALUES ($1, $2, $3, true, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month')
       RETURNING *`,
      [nombre, email_contacto.toLowerCase().trim(), ciudad || null]
    )

    return res.status(201).json(newGymRes.rows[0])
  } catch (err) {
    console.error('Error creating gym:', err)
    if (err.code === '23505') { // Unique key violation
      return res.status(400).json({ error: 'Ya existe un gimnasio registrado con ese correo electrónico de contacto' })
    }
    return res.status(500).json({ error: 'Error al registrar el gimnasio' })
  }
})


export default router
