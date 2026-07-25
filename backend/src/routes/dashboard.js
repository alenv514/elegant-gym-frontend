import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../config/db.js'

const router = express.Router()

router.use(authenticateToken)

/**
 * GET /api/dashboard
 * Aggregates all KPI metrics and tables for the home page in a single query cluster.
 */
router.get('/', async (req, res) => {
  const gymId = req.user.gym_id

  try {
    // 1. Total active members (vencimiento >= today)
    const activeMembersRes = await query(
      `SELECT COUNT(*)::int as count FROM members 
       WHERE gym_id = $1 AND fecha_vencimiento >= CURRENT_DATE`,
      [gymId]
    )

    // 2. Count classes for today (based on day name)
    // We map PostgreSQL's day names or count classes that are active.
    const classesCountRes = await query(
      'SELECT COUNT(*)::int as count FROM classes WHERE gym_id = $1',
      [gymId]
    )

    // 3. Count members with pending payments (vencido or por_vencer)
    const pendingPaymentsRes = await query(
      `SELECT COUNT(*)::int as count FROM members 
       WHERE gym_id = $1 AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '2 days'`,
      [gymId]
    )

    // 4. Monthly earnings sum (member payments inside the current month)
    const monthlyEarningsRes = await query(
      `SELECT COALESCE(SUM(monto), 0)::numeric::float as total 
       FROM member_payments 
       WHERE gym_id = $1 
         AND EXTRACT(MONTH FROM fecha_pago) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM fecha_pago) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [gymId]
    )

    // 5. Fetch classes details (limit to classes today or all classes if simplified)
    const classesRes = await query(
      `SELECT c.id, c.nombre, c.instructor, c.capacidad_max, c.horario,
              COUNT(ce.member_id)::int as inscritos
       FROM classes c
       LEFT JOIN class_enrollments ce ON c.id = ce.class_id
       WHERE c.gym_id = $1
       GROUP BY c.id
       LIMIT 5`,
      [gymId]
    )

    // Helper to extract hour string for matching frontend format
    const classesFormatted = classesRes.rows.map(c => {
      const schedule = c.horario || []
      const timeStr = schedule[0]?.hora || 'Todo el día'
      return {
        id: c.id,
        nombre: c.nombre,
        hora: timeStr,
        inscritos: c.inscritos,
        capacidad: c.capacidad_max,
        instructor: c.instructor
      }
    })

    // 6. Fetch members close to expiration (vencido or por_vencer)
    const upcomingExpirationsRes = await query(
      `SELECT id, nombre, fecha_vencimiento,
              CASE 
                WHEN fecha_vencimiento < CURRENT_DATE THEN 'vencido'
                ELSE 'por_vencer'
              END as estado
       FROM members 
       WHERE gym_id = $1 AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '5 days'
       ORDER BY fecha_vencimiento ASC
       LIMIT 5`,
      [gymId]
    )

    return res.json({
      miembrosActivos: activeMembersRes.rows[0]?.count || 0,
      clasesDehoy: classesCountRes.rows[0]?.count || 0,
      pagosPendientes: pendingPaymentsRes.rows[0]?.count || 0,
      ingresosMes: monthlyEarningsRes.rows[0]?.total || 0,
      clasesHoy: classesFormatted,
      pagosProximos: upcomingExpirationsRes.rows.map(p => ({
        id: p.id,
        nombre: p.nombre,
        vencimiento: p.fecha_vencimiento,
        estado: p.estado
      }))
    })

  } catch (err) {
    console.error('Error fetching dashboard stats:', err)
    return res.status(500).json({ error: 'Error al cargar estadísticas del dashboard' })
  }
})

export default router
