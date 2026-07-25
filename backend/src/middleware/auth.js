import jwt from 'jsonwebtoken'
import { query } from '../config/db.js'

/**
 * Middleware to authenticate requests via JWT.
 * Verifies token validity, attaches user details to `req.user`,
 * and enforces subscription checks.
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Fetch fresh user data from DB (to get latest role and subscription details)
    const userRes = await query(
      `SELECT u.id, u.nombre, u.email, u.rol, u.gym_id, g.nombre as gym_nombre, g.suscripcion_activa
       FROM users u
       LEFT JOIN gyms g ON u.gym_id = g.id
       WHERE u.id = $1`,
      [decoded.id]
    )

    const user = userRes.rows[0]

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    // Attach user object to request
    req.user = user

    // Enforce account suspension check (multi-tenant safety)
    // saas_owner is exempt from suspension locks
    if (user.rol !== 'saas_owner') {
      if (!user.suscripcion_activa) {
        return res.status(403).json({ 
          error: 'SUSPENDED',
          message: 'Cuenta suspendida por falta de pago. Contacta a soporte.' 
        })
      }
    }

    next()
  } catch (err) {
    console.error('JWT Verification Error:', err.message)
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

/**
 * Middleware factory to authorize specific roles.
 * Must be placed AFTER authenticateToken middleware.
 * 
 * @param {Array<string>} roles - Roles allowed to access the route
 */
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ error: 'Falta middleware de autenticación' })
    }

    // saas_owner always bypasses role checks
    if (req.user.rol === 'saas_owner') {
      return next()
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' })
    }

    next()
  }
}
