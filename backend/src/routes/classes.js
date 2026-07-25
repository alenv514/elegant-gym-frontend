import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { query } from '../config/db.js'

const router = express.Router()

router.use(authenticateToken)

/**
 * GET /api/classes
 * Lists classes with real-time enrollment counts.
 */
router.get('/', async (req, res) => {
  const gymId = req.user.gym_id

  try {
    const classesRes = await query(
      `SELECT c.id, c.nombre, c.instructor, c.capacidad_max, c.horario, c.descripcion,
              COUNT(ce.member_id)::int as inscritos
       FROM classes c
       LEFT JOIN class_enrollments ce ON c.id = ce.class_id
       WHERE c.gym_id = $1
       GROUP BY c.id
       ORDER BY c.nombre ASC`,
      [gymId]
    )
    return res.json(classesRes.rows)
  } catch (err) {
    console.error('Error fetching classes:', err)
    return res.status(500).json({ error: 'Error al obtener lista de clases' })
  }
})

/**
 * POST /api/classes
 * Creates a new class.
 */
router.post('/', async (req, res) => {
  const gymId = req.user.gym_id
  const { nombre, instructor, capacidad_max, horario, descripcion } = req.body

  if (!nombre || !horario) {
    return res.status(400).json({ error: 'El nombre de la clase y el horario son requeridos' })
  }

  try {
    const newClassRes = await query(
      `INSERT INTO classes (gym_id, nombre, instructor, capacidad_max, horario, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [gymId, nombre, instructor || null, capacidad_max || 20, JSON.stringify(horario), descripcion || null]
    )

    return res.status(201).json(newClassRes.rows[0])
  } catch (err) {
    console.error('Error creating class:', err)
    return res.status(500).json({ error: 'Error al crear la clase' })
  }
})

/**
 * PUT /api/classes/:id
 * Updates details of an existing class.
 */
router.put('/:id', async (req, res) => {
  const gymId = req.user.gym_id
  const classId = req.params.id
  const { nombre, instructor, capacidad_max, horario, descripcion } = req.body

  try {
    // Verify class belongs to this gym
    const checkRes = await query('SELECT id FROM classes WHERE id = $1 AND gym_id = $2', [classId, gymId])
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Clase no encontrada' })
    }

    const fields = []
    const params = [classId, gymId]
    let paramIndex = 3

    if (nombre) { fields.push(`nombre = $${paramIndex}`); params.push(nombre); paramIndex++ }
    if (instructor !== undefined) { fields.push(`instructor = $${paramIndex}`); params.push(instructor || null); paramIndex++ }
    if (capacidad_max) { fields.push(`capacidad_max = $${paramIndex}`); params.push(capacidad_max); paramIndex++ }
    if (horario) { fields.push(`horario = $${paramIndex}`); params.push(JSON.stringify(horario)); paramIndex++ }
    if (descripcion !== undefined) { fields.push(`descripcion = $${paramIndex}`); params.push(descripcion || null); paramIndex++ }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar' })
    }

    const sql = `UPDATE classes SET ${fields.join(', ')} WHERE id = $1 AND gym_id = $2 RETURNING *`
    const updateRes = await query(sql, params)

    return res.json(updateRes.rows[0])
  } catch (err) {
    console.error('Error updating class:', err)
    return res.status(500).json({ error: 'Error al actualizar clase' })
  }
})

/**
 * GET /api/classes/:id/members
 * Returns members enrolled in a specific class.
 */
router.get('/:id/members', async (req, res) => {
  const gymId = req.user.gym_id
  const classId = req.params.id

  try {
    const membersRes = await query(
      `SELECT m.id, m.nombre, m.telefono, m.fecha_vencimiento,
              p.nombre as plan_nombre,
              CASE
                WHEN m.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
                WHEN m.fecha_vencimiento <= CURRENT_DATE + INTERVAL '2 days' THEN 'por_vencer'
                ELSE 'activo'
              END as estado
       FROM members m
       JOIN class_enrollments ce ON ce.member_id = m.id
       LEFT JOIN plans p ON m.plan_id = p.id
       WHERE ce.class_id = $1 AND ce.gym_id = $2
       ORDER BY m.nombre ASC`,
      [classId, gymId]
    )
    return res.json(membersRes.rows)
  } catch (err) {
    console.error('Error fetching class members:', err)
    return res.status(500).json({ error: 'Error al obtener miembros de la clase' })
  }
})

/**
 * POST /api/classes/:id/enroll
 * Enrolls a member into a class, verifying class capacity limits beforehand.
 */
router.post('/:id/enroll', async (req, res) => {
  const gymId = req.user.gym_id
  const classId = req.params.id
  const { member_id } = req.body

  if (!member_id) {
    return res.status(400).json({ error: 'ID de miembro es obligatorio' })
  }

  try {
    // 1. Verify class exists and get its capacity
    const classRes = await query(
      `SELECT c.capacidad_max, COUNT(ce.id)::int as inscritos
       FROM classes c
       LEFT JOIN class_enrollments ce ON c.id = ce.class_id
       WHERE c.id = $1 AND c.gym_id = $2
       GROUP BY c.id`,
      [classId, gymId]
    )

    const cls = classRes.rows[0]

    if (!cls) {
      return res.status(404).json({ error: 'Clase no encontrada' })
    }

    // 2. Enforce class capacity limits
    if (cls.inscritos >= cls.capacidad_max) {
      return res.status(400).json({ error: 'La clase ya ha alcanzado su capacidad máxima' })
    }

    // 3. Verify member exists in this gym
    const memberRes = await query('SELECT id FROM members WHERE id = $1 AND gym_id = $2', [member_id, gymId])
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado' })
    }

    // 4. Perform enrollment
    await query(
      `INSERT INTO class_enrollments (class_id, member_id, gym_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (class_id, member_id) DO NOTHING`,
      [classId, member_id, gymId]
    )

    return res.json({ success: true, message: 'Miembro inscrito exitosamente' })
  } catch (err) {
    console.error('Enrollment error:', err)
    return res.status(500).json({ error: 'Error al inscribir miembro en la clase' })
  }
})

/**
 * DELETE /api/classes/:id/enroll/:memberId
 * Unenrolls a member from a class.
 */
router.delete('/:id/enroll/:memberId', async (req, res) => {
  const gymId = req.user.gym_id
  const classId = req.params.id
  const memberId = req.params.memberId

  try {
    const deleteRes = await query(
      'DELETE FROM class_enrollments WHERE class_id = $1 AND member_id = $2 AND gym_id = $3 RETURNING id',
      [classId, memberId, gymId]
    )

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Inscripción no encontrada' })
    }

    return res.json({ success: true, message: 'Miembro desinscrito exitosamente' })
  } catch (err) {
    console.error('Unenrollment error:', err)
    return res.status(500).json({ error: 'Error al desinscribir miembro de la clase' })
  }
})

/**
 * DELETE /api/classes/:id
 * Removes a class definition.
 */
router.delete('/:id', async (req, res) => {
  const gymId = req.user.gym_id
  const classId = req.params.id

  try {
    const deleteRes = await query('DELETE FROM classes WHERE id = $1 AND gym_id = $2 RETURNING id', [classId, gymId])
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Clase no encontrada' })
    }
    return res.json({ success: true, message: 'Clase eliminada correctamente' })
  } catch (err) {
    console.error('Error deleting class:', err)
    return res.status(500).json({ error: 'Error al eliminar la clase' })
  }
})

export default router
