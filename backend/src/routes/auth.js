import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../config/db.js'

const router = express.Router()

/**
 * POST /api/auth/login
 * Validates credentials and returns JWT token + user details
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' })
  }

  try {
    // Fetch user and join their gym status
    const userRes = await query(
      `SELECT u.id, u.nombre, u.email, u.password_hash, u.rol, u.gym_id, 
              g.nombre as gym_nombre, g.suscripcion_activa
       FROM users u
       LEFT JOIN gyms g ON u.gym_id = g.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    )

    const user = userRes.rows[0]

    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    // Compare passwords using bcrypt
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, rol: user.rol, gym_id: user.gym_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    // Respond with user details (excluding password_hash)
    return res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        gym_id: user.gym_id,
        gym_nombre: user.gym_nombre,
        suscripcion_activa: user.rol === 'saas_owner' ? true : user.suscripcion_activa
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

export default router
