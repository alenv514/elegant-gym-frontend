import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { 
  initWhatsAppSession, 
  logoutWhatsApp, 
  initWithPairingCode 
} from '../utils/whatsappManager.js'
import { query } from '../config/db.js'
import QRCode from 'qrcode'

const router = express.Router()

// Ensure all WhatsApp endpoints require authentication
router.use(authenticateToken)

/**
 * GET /api/whatsapp/qr
 * Cleans any stale session, starts a fresh WhatsApp session,
 * and returns the QR code string + base64 image
 */
router.get('/qr', async (req, res) => {
  const gymId = req.user.gym_id

  if (!gymId) {
    return res.status(400).json({ error: 'El administrador global de SaaS no tiene canal de WhatsApp' })
  }

  try {
    // Clean any existing stale session first
    await logoutWhatsApp(gymId)

    let qrSent = false
    let timeoutTimer

    console.log(`🔄 Starting fresh WhatsApp session for gym_id: ${gymId}`)

    // Initialize session and listen for QR generation
    await initWhatsAppSession(gymId, async (qrString) => {
      if (qrSent) return
      qrSent = true
      clearTimeout(timeoutTimer)

      try {
        const qrImageBase64 = await QRCode.toDataURL(qrString)
        console.log(`✅ QR generated and sent for gym_id: ${gymId}`)
        return res.json({ qr: qrString, image: qrImageBase64 })
      } catch (qrErr) {
        console.error('Error rendering QR image:', qrErr)
        return res.status(500).json({ error: 'Error al generar imagen de código QR' })
      }
    })

    // Timeout fallback if QR takes too long
    timeoutTimer = setTimeout(async () => {
      if (!qrSent) {
        qrSent = true
        console.log(`⏱️ QR timeout reached for gym_id: ${gymId}`)
        try {
          const statusRes = await query(
            'SELECT estado_conexion FROM whatsapp_sessions WHERE gym_id = $1', 
            [gymId]
          )
          const status = statusRes.rows[0]?.estado_conexion || 'DESCONECTADO'
          
          if (status === 'CONECTADO') {
            return res.json({ status, message: 'WhatsApp ya se encuentra conectado' })
          }
          
          return res.json({ 
            status, 
            message: status === 'GENERANDO_QR' 
              ? 'QR generado pero hubo un error al procesarlo. Intenta de nuevo.' 
              : 'Tiempo de espera agotado. Intenta de nuevo.' 
          })
        } catch (e) {
          return res.json({ status: 'DESCONECTADO', message: 'Tiempo de espera agotado' })
        }
      }
    }, 20000)

    res.on('close', () => {
      clearTimeout(timeoutTimer)
      qrSent = true
    })

  } catch (err) {
    console.error('QR route error:', err.message)
    return res.status(500).json({ error: 'Error al inicializar sesión de WhatsApp' })
  }
})

/**
 * POST /api/whatsapp/pair
 * Alternative to QR: generates a pairing code that the user enters in WhatsApp.
 * Body: { phone: "593999752932" }
 * 
 * Waits for WebSocket connection before requesting the pairing code.
 */
router.post('/pair', async (req, res) => {
  const gymId = req.user.gym_id

  if (!gymId) {
    return res.status(400).json({ error: 'El administrador global de SaaS no tiene canal de WhatsApp' })
  }

  const { phone } = req.body

  if (!phone) {
    return res.status(400).json({ error: 'Debes proporcionar un número de teléfono' })
  }

  try {
    // Use the all-in-one function that properly waits for WebSocket connection
    const code = await initWithPairingCode(gymId, phone)

    console.log(`✅ Pairing code generated for gym_id: ${gymId}: ${code}`)

    return res.json({ 
      success: true, 
      code,
      message: `Código de vinculación: ${code}. Ingresa este código en WhatsApp > Menú ⋮ > Dispositivos vinculados > Vincular usando número de teléfono.`
    })

  } catch (err) {
    console.error('❌ Pair route error:', err.message)
    return res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/whatsapp/status
 * Returns current connection status and active phone number
 */
router.get('/status', async (req, res) => {
  const gymId = req.user.gym_id

  if (!gymId) {
    return res.status(400).json({ error: 'El administrador global no tiene canal de WhatsApp' })
  }

  try {
    const statusRes = await query(
      'SELECT estado_conexion, numero_telefono, updated_at FROM whatsapp_sessions WHERE gym_id = $1',
      [gymId]
    )

    const session = statusRes.rows[0]

    return res.json({
      status: session?.estado_conexion || 'DESCONECTADO',
      numero_telefono: session?.numero_telefono || null,
      updated_at: session?.updated_at || null
    })
  } catch (err) {
    console.error('Status route error:', err)
    return res.status(500).json({ error: 'Error al consultar estado de WhatsApp' })
  }
})

/**
 * POST /api/whatsapp/logout
 * Closes and wipes session credentials
 */
router.post('/logout', async (req, res) => {
  const gymId = req.user.gym_id

  if (!gymId) {
    return res.status(400).json({ error: 'Operación no válida' })
  }

  try {
    await logoutWhatsApp(gymId)
    return res.json({ success: true, message: 'Sesión de WhatsApp cerrada exitosamente' })
  } catch (err) {
    console.error('Logout route error:', err)
    return res.status(500).json({ error: 'Error al desconectar WhatsApp' })
  }
})

export default router
