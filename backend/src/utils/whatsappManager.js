import makeWASocket, { 
  DisconnectReason, 
  initAuthCreds, 
  BufferJSON,
  fetchLatestWaWebVersion,
  Browsers
} from '@whiskeysockets/baileys'
import pino from 'pino'
import { query } from '../config/db.js'
import { useMultiFileAuthState } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

const activeConnections = new Map()
const logger = pino({ level: 'silent' })

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getGymAuthState(gym_id) {
  const sessionDir = path.join(process.cwd(), 'sessions', `gym_${gym_id}`)
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
  }
  return await useMultiFileAuthState(sessionDir)
}

function wipeSessionDisk(gym_id) {
  const sessionDir = path.join(process.cwd(), 'sessions', `gym_${gym_id}`)
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true })
    console.log(`🧹 Wiped stale session data for gym_id: ${gym_id}`)
  }
  fs.mkdirSync(sessionDir, { recursive: true })
}

function cleanStaleMemoryConnection(gym_id) {
  if (activeConnections.has(gym_id)) {
    const conn = activeConnections.get(gym_id)
    try {
      if (conn.socket && typeof conn.socket.removeAllListeners === 'function') {
        conn.socket.removeAllListeners()
      }
      if (conn.socket && typeof conn.socket.ws?.close === 'function') {
        conn.socket.ws.close()
      }
      if (conn.socket && typeof conn.socket.logout === 'function') {
        conn.socket.logout().catch(err => console.warn(`⚠️ Logout error during cleanup: ${err.message}`))
      }
    } catch (err) {
      console.warn(`⚠️ Error cleaning memory connection for gym_id ${gym_id}: ${err.message}`)
    }
    activeConnections.delete(gym_id)
    console.log(`🧹 Cleaned stale memory connection for gym_id: ${gym_id}`)
  }
}

/**
 * Creates a WhatsApp socket and monitors its events.
 * Handles DisconnectReason.restartRequired by recursively creating a new socket.
 *
 * @param {number} gym_id
 * @param {function|null} onQrCallback - Callback for QR (only for first-time auth)
 * @param {boolean} isRetry - true if this is a restartRequired recovery socket
 * @returns {Promise<object>} the socket
 */
async function createAndMonitorSocket(gym_id, onQrCallback, isRetry = false) {
  const { state, saveCreds } = await getGymAuthState(gym_id)

  let version
  try {
    const versionRes = await fetchLatestWaWebVersion()
    version = versionRes.version
    if (!isRetry) console.log(`📱 Using WA Web version: ${version.join('.')}`)
  } catch (vErr) {
    console.warn('⚠️ Could not fetch latest WA version, using default fallback')
  }

  let sock
  try {
    sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      fireInitQueries: false,
      shouldIgnoreJid: () => true,
      connectTimeoutMs: 60_000,
      keepAliveIntervalMs: 25_000,
      emitOwnEvents: true,
      downloadHistory: false,
      linkPreviewImage: false,
    })
  } catch (err) {
    console.error('❌ Error creating WhatsApp socket:', err)
    throw err
  }

  activeConnections.set(gym_id, {
    socket: sock,
    qr: null,
    status: isRetry ? 'RECONECTANDO' : 'DESCONECTADO'
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    // ── QR Code event (only emit for initial socket, not retries) ──
    if (qr && !isRetry) {
      console.log(`📸 Fresh QR Code generated for gym_id: ${gym_id}`)
      if (activeConnections.has(gym_id)) {
        activeConnections.get(gym_id).qr = qr
        activeConnections.get(gym_id).status = 'GENERANDO_QR'
      }

      try {
        await query(
          'UPDATE whatsapp_sessions SET estado_conexion = $1, updated_at = NOW() WHERE gym_id = $2',
          ['GENERANDO_QR', gym_id]
        )
      } catch (dbErr) {
        console.warn(`⚠️ DB update error: ${dbErr.message}`)
      }

      if (onQrCallback) onQrCallback(qr)
    }

    // ── Connected ──
    if (connection === 'open') {
      const userJid = sock.user?.id || ''
      const phoneNum = userJid.split(':')[0]
      console.log(`🟢 WhatsApp Connected for gym_id: ${gym_id} (${phoneNum})`)

      if (activeConnections.has(gym_id)) {
        activeConnections.get(gym_id).qr = null
        activeConnections.get(gym_id).status = 'CONECTADO'
      }

      try {
        await query(
          `UPDATE whatsapp_sessions 
           SET estado_conexion = $1, numero_telefono = $2, updated_at = NOW() 
           WHERE gym_id = $3`,
          ['CONECTADO', phoneNum, gym_id]
        )
      } catch (dbErr) {
        console.warn(`⚠️ DB update error: ${dbErr.message}`)
      }

      console.log('✅ WhatsApp session fully established')
    }

    // ── Disconnected ──
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const reason = lastDisconnect?.error?.message || 'unknown'

      // 🟢 KEY FIX: Handle restartRequired
      // After scanning QR, Baileys disconnects on purpose to reload with fresh credentials.
      // We must create a NEW socket instead of cleaning up.
      if (statusCode === DisconnectReason.restartRequired) {
        console.log(`🔄 Restart required for gym_id: ${gym_id} — creating new socket with updated credentials...`)
        // Remove old socket from memory (but keep session files on disk!)
        if (activeConnections.has(gym_id)) {
          try { sock.removeAllListeners() } catch {}
          activeConnections.delete(gym_id)
        }
        // Recursively create a new socket that will pick up the updated creds
        createAndMonitorSocket(gym_id, null, true).catch(err => {
          console.error(`❌ Recovery socket creation failed: ${err.message}`)
        })
        // DO NOT update DB to DESCONECTADO here — the new socket will set the correct status
        return
      }

      // ── For all other disconnect reasons, clean up ──
      console.log(`🔴 WhatsApp connection closed for gym_id: ${gym_id} (code: ${statusCode}, reason: ${reason})`)

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('🚫 Session was logged out from WhatsApp (phone unlinked)')
      } else if (statusCode === DisconnectReason.badSession) {
        console.log('⚠️ Bad session detected - will need fresh QR')
      } else if (statusCode === DisconnectReason.connectionFailed) {
        console.log('⚠️ Connection failed - check network/WebSocket connectivity')
      } else if (statusCode === 429) {
        console.log('⏳ Rate limited by WhatsApp - wait at least 2 hours before retrying')
      }

      activeConnections.delete(gym_id)

      try {
        await query(
          'UPDATE whatsapp_sessions SET estado_conexion = $1, updated_at = NOW() WHERE gym_id = $2',
          ['DESCONECTADO', gym_id]
        )
      } catch (dbErr) {
        console.warn(`⚠️ DB update error: ${dbErr.message}`)
      }
    }
  })

  return sock
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Initializes a fresh WhatsApp session for QR code scanning.
 * ALWAYS cleans stale data first.
 */
export async function initWhatsAppSession(gym_id, onQrCallback) {
  cleanStaleMemoryConnection(gym_id)
  wipeSessionDisk(gym_id)

  try {
    await query(
      `UPDATE whatsapp_sessions 
       SET estado_conexion = 'DESCONECTADO', session_data = NULL, numero_telefono = NULL, updated_at = NOW() 
       WHERE gym_id = $1`,
      [gym_id]
    )
  } catch (dbErr) {
    console.warn(`⚠️ Could not reset DB state for gym_id ${gym_id}: ${dbErr.message}`)
  }

  console.log(`🔌 Initializing fresh WhatsApp session for gym_id: ${gym_id}...`)
  return await createAndMonitorSocket(gym_id, onQrCallback, false)
}

/**
 * One-step: initialize session and request pairing code.
 * Waits for the WebSocket to connect to WhatsApp servers before requesting the code.
 * More reliable than calling initWhatsAppSession + requestPairingCode separately.
 *
 * @param {number} gym_id
 * @param {string} phoneNumber - Full phone number with country code (digits only)
 * @param {number} timeoutMs - How long to wait for WebSocket connection
 * @returns {Promise<string>} The 8-digit pairing code
 */
export async function initWithPairingCode(gym_id, phoneNumber, timeoutMs = 15000) {
  // Validate phone
  const cleanPhone = phoneNumber.replace(/\D/g, '')
  if (cleanPhone.length < 10) {
    throw new Error('Número de teléfono inválido. Debe tener al menos 10 dígitos.')
  }

  // ── Step 1: Clean stale state ──
  cleanStaleMemoryConnection(gym_id)
  wipeSessionDisk(gym_id)

  try {
    await query(
      `UPDATE whatsapp_sessions 
       SET estado_conexion = 'DESCONECTADO', session_data = NULL, numero_telefono = NULL, updated_at = NOW() 
       WHERE gym_id = $1`,
      [gym_id]
    )
  } catch (dbErr) {
    console.warn(`⚠️ Could not reset DB state for gym_id ${gym_id}: ${dbErr.message}`)
  }

  console.log(`🔌 Initializing WhatsApp session for pairing code, gym_id: ${gym_id}...`)

  // ── Step 2: Create the socket ──
  await createAndMonitorSocket(gym_id, null, false)

  const conn = activeConnections.get(gym_id)
  if (!conn || !conn.socket) {
    throw new Error('Error al crear la sesión de WhatsApp')
  }

  // ── Step 3: Wait for WebSocket to connect ──
  console.log(`⏳ Waiting for WebSocket connection to WhatsApp servers...`)

  const wsReady = await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn(`⚠️ Timeout waiting for WebSocket connection for gym_id: ${gym_id}`)
      resolve(false)
    }, timeoutMs)

    // Listen for the first connection.update event that signals WebSocket is alive
    const handler = (update) => {
      const { qr, connection } = update
      // If we get a QR, an open connection, or even a close/connecting, the WebSocket is alive
      if (qr || connection === 'open') {
        clearTimeout(timeout)
        conn.socket.ev.off('connection.update', handler)
        console.log(`✅ WebSocket connected (connection: ${connection || 'qr-generated'})`)
        resolve(true)
      }
    }

    conn.socket.ev.on('connection.update', handler)
  })

  if (!wsReady) {
    throw new Error('No se pudo conectar con los servidores de WhatsApp. Revisa tu conexión a internet e intenta de nuevo.')
  }

  // ── Step 4: Short extra wait for the socket to fully initialize ──
  await new Promise(r => setTimeout(r, 1000))

  // ── Step 5: Request the pairing code ──
  try {
    const code = await conn.socket.requestPairingCode(cleanPhone)
    console.log(`🔑 Pairing code generated for gym_id: ${gym_id} (phone: ${cleanPhone}): ${code}`)
    return code
  } catch (err) {
    console.error(`❌ Pairing code error for gym_id ${gym_id}:`, err.message, err.stack)
    throw new Error(`Error al solicitar código de vinculación: ${err.message}`)
  }
}

/**
 * Gets the active socket for a gym.
 */
export async function getWhatsAppSocket(gym_id) {
  const conn = activeConnections.get(gym_id)
  if (conn && conn.status === 'CONECTADO') {
    return conn.socket
  }
  return null
}

/**
 * Sends a message from a gym's account to a client number.
 * Resolves once the message has been queued by Baileys.
 * Does NOT wait for delivery ACK — that would require incoming events
 * which are suppressed by shouldIgnoreJid.
 */
export async function sendWhatsAppMessage(gym_id, to, text) {
  let cleanTo = (to || '').replace(/\D/g, '')
  if (!cleanTo) throw new Error('Número de teléfono inválido')

  // Auto-format local Ecuador numbers (e.g. 0991234567 -> 593991234567)
  if (cleanTo.startsWith('0')) {
    cleanTo = '593' + cleanTo.substring(1)
  }

  const jid = `${cleanTo}@s.whatsapp.net`
  const socket = await getWhatsAppSocket(gym_id)

  if (!socket) {
    throw new Error('El canal de WhatsApp no está conectado para este gimnasio')
  }

  // Send message with 8-second safety timeout so invalid/hanging numbers don't block batch execution
  const sentMsg = await Promise.race([
    socket.sendMessage(jid, { text }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('WhatsApp server timeout (8s limit)')), 8000)
    )
  ])

  const msgId = sentMsg?.key?.id

  if (!msgId) {
    console.error(`❌ No message ID returned for gym_id ${gym_id} to ${jid}`)
    throw new Error('No se pudo obtener ID del mensaje')
  }

  console.log(`✉️  Message sent to ${jid} (ID: ${msgId})`)
}

/**
 * Reconecta sesiones de WhatsApp que tengan credenciales guardadas en disco.
 * Se llama automáticamente al arrancar el servidor.
 * No espera a que conecten — los eventos del socket manejan el estado automáticamente.
 */
export async function reconectarSesionesActivas() {
  const sessionsDir = path.join(process.cwd(), 'sessions')
  if (!fs.existsSync(sessionsDir)) {
    console.log('📂 No hay directorio de sesiones — nada que reconectar')
    return
  }

  const gymFolders = fs.readdirSync(sessionsDir).filter(f => f.startsWith('gym_'))
  if (gymFolders.length === 0) {
    console.log('📂 No hay sesiones guardadas en disco')
    return
  }

  console.log(`🔄 Reconectando ${gymFolders.length} sesión(es) de WhatsApp...`)

  for (const folder of gymFolders) {
    const gymId = parseInt(folder.replace('gym_', ''), 10)
    if (isNaN(gymId)) continue

    const credsPath = path.join(sessionsDir, folder, 'creds.json')
    if (!fs.existsSync(credsPath)) continue

    console.log(`🔄 Reconectando gym_id: ${gymId}...`)

    // createAndMonitorSocket actualiza DB y estado en memoria automáticamente
    // via connection.update event handler (CONECTADO, DESCONECTADO, etc.)
    createAndMonitorSocket(gymId, null, false).catch(err =>
      console.error(`❌ Error reconectando gym_id ${gymId}: ${err.message}`)
    )
  }
}

/**
 * Logs out and clears connection from memory & disk.
 */
export async function logoutWhatsApp(gym_id) {
  const conn = activeConnections.get(gym_id)
  if (conn) {
    try {
      if (conn.socket && typeof conn.socket.removeAllListeners === 'function') {
        conn.socket.removeAllListeners()
      }
      await conn.socket.logout()
    } catch (err) {
      console.warn(`⚠️ Error during logout for gym_id ${gym_id}: ${err.message}`)
    }
    activeConnections.delete(gym_id)
  }

  const sessionDir = path.join(process.cwd(), 'sessions', `gym_${gym_id}`)
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true })
  }

  try {
    await query(
      `UPDATE whatsapp_sessions 
       SET estado_conexion = $1, session_data = NULL, numero_telefono = NULL, updated_at = NOW() 
       WHERE gym_id = $2`,
      ['DESCONECTADO', gym_id]
    )
  } catch (dbErr) {
    console.warn(`⚠️ Could not reset DB state for gym_id ${gym_id}: ${dbErr.message}`)
  }
}
