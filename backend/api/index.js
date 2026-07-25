import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Import routes
import authRouter from '../src/routes/auth.js'
import whatsappRouter from '../src/routes/whatsapp.js'

// Import cron services
import { iniciarRecordatorios } from '../src/services/recordatorios.js'
import { iniciarVerificacionSuscripciones } from '../src/services/suscripciones.js'
import membersRouter from '../src/routes/members.js'
import classesRouter from '../src/routes/classes.js'
import paymentsRouter from '../src/routes/payments.js'
import dashboardRouter from '../src/routes/dashboard.js'
import adminRouter from '../src/routes/admin.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Enforce CORS to allow frontend connections
app.use(cors({
  origin: '*', // Adjust to frontend domain in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// Healthcheck endpoint
app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok', timestamp: new Date() })
})

// Protected route for fetching membership plans of the logged-in gym
import { authenticateToken } from '../src/middleware/auth.js'
import { query } from '../src/config/db.js'
app.get('/api/plans', authenticateToken, async (req, res) => {
  const gymId = req.user.gym_id
  try {
    const plansRes = await query('SELECT id, nombre, precio, duracion_dias FROM plans WHERE gym_id = $1 ORDER BY nombre ASC', [gymId])
    return res.json(plansRes.rows)
  } catch (err) {
    console.error('Error fetching plans:', err)
    return res.status(500).json({ error: 'Error al obtener planes' })
  }
})

// Route mountings
app.use('/api/auth', authRouter)
app.use('/api/whatsapp', whatsappRouter)
app.use('/api/members', membersRouter)
app.use('/api/classes', classesRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/admin', adminRouter)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack)
  res.status(500).json({ error: 'Algo salió mal en el servidor' })
})

app.listen(PORT, () => {
  console.log(`🚀 Elegant for Gym Backend running on port ${PORT}`)
  
  // Start automatic WhatsApp reminders (daily at 09:00 AM)
  iniciarRecordatorios().catch(err => console.error('❌ Error al iniciar recordatorios:', err.message))
  // Start automatic SaaS subscription verification (daily at 09:00 AM)
  iniciarVerificacionSuscripciones().catch(err => console.error('❌ Error al iniciar verificación de suscripciones:', err.message))
})

export default app
