import makeWASocket, { 
  DisconnectReason, 
  initAuthCreds, 
  BufferJSON,
  fetchLatestWaWebVersion,
  Browsers,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import pino from 'pino'
import { query } from '../config/db.js'
import fs from 'fs'
import path from 'path'

const activeConnections = new Map()
const logger = pino({ level: 'silent' })

// ─── Database-Backed Auth Persistence ────────────────────────────────────────

/**
 * Serializes local session JSON files and backs them up to PostgreSQL.
 */
async function saveSessionDataToDb(gym_id) {
  try {
    const sessionDir = path.join(process.cwd(), 'sessions', `gym_${gym_id}`)
    if (!fs.existsSync(sessionDir)) return

    const files = fs.readdirSync(sessionDir)
    const sessionData = {}

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(sessionDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        sessionData[file] = JSON.parse(content)
      }
    }

    if (Object.keys(sessionData).length > 0) {
      await query(
        `UPDATE whatsapp_sessions SET session_data = $1, updated_at = NOW() WHERE gym_id = $2`,
        [JSON.stringify(sessionData), gym_id]
      )
    }
  } catch (err) {
    console.warn(`⚠️ Could not backup session data to DB for gym_id ${gym_id}: ${err.message}`)
  }
}

/**
 * Restores session JSON files from PostgreSQL database to disk if missing.
 */
async function restoreSessionDataFromDb(gym_id) {
  try {
    const sessionDir = path.join(process.cwd(), 'sessions', `gym_${gym_id}`)
    const res = await query(
      `SELECT session_data FROM whatsapp_sessions WHERE gym_id = $1`,
      [gym_id]
    )

    const sessionData = res.rows[0]?.session_data
    if (!sessionData) return false

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true })
    }

    const files = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(sessionDir, filename)
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8')
    }

    console.log(`📦 Restored WhatsApp session data from DB for gym_id: ${gym_id}`)
    return true
  } catch (err) {
    console.warn(`⚠️ Could not restore session data from DB for gym_id ${gym_id}: ${err.message}`)
    return false
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getGymAuthState(gym_id) {
  const sessionDir = path.join(process.cwd(), 'sessions', `gym_${gym_id}`)
  const credsPath = path.join(sessionDir, 'creds.json')

  // If local files were lost (e.g. Railway container restart), restore from DB
  if (!fs.existsSync(credsPath)) {
    await restoreSessionDataFromDb(gym_id)
  }

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

  sock.ev.on('creds.update', async (keys) => {
    await saveCreds(keys)
    await saveSessionDataToDb(gym_id)
  })

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

      // Persist session state into PostgreSQL DB
      await saveSessionDataToDb(gym_id)
      console.log('✅ WhatsApp session fully established & saved to DB')
    }

    // ── Disconnected ──
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const reason = lastDisconnect?.error?.message || 'unknown'

      // 🟢 Handle restartRequired: Baileys reloads after QR scan
      if (statusCode === DisconnectReason.restartRequired) {
        console.log(`🔄 Restart required for gym_id: ${gym_id} — creating new socket...`)
        if (activeConnections.has(gym_id)) {
          try { sock.removeAllListeners() } catch {}
          activeConnections.delete(gym_id)
        }
        createAndMonitorSocket(gym_id, null, true).catch(err => {
          console.error(`❌ Recovery socket creation failed: ${err.message}`)
        })
        return
      }

      // ── For all other disconnect reasons, clean up ──
      console.log(`🔴 WhatsApp connection closed for gym_id: ${gym_id} (code: ${statusCode}, reason: ${reason})`)

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('🚫 Session was logged out from WhatsApp (phone unlinked)')
        // Clean session_data from DB when logged out
        await query(
          `UPDATE whatsapp_sessions SET session_data = NULL WHERE gym_id = $1`,
          [gym_id]
        ).catch(() => {})
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
 */
export async function sendWhatsAppMessage(gym_id, to, text) {
  let cleanTo = (to || '').replace(/\D/g, '')
  if (!cleanTo) throw new Error('Número de teléfono inválido')

  // Auto-format local Ecuador numbers (e.g. 0991234567 -> 593991234567)
  if (cleanTo.startsWith('0')) {
    cleanTo = '593' + cleanTo.substring(1)
  }

  const jid = `${cleanTo}@s.whatsapp.net`
  let socket = await getWhatsAppSocket(gym_id)

  // 🔄 Automatic Reconnect if socket is not active in memory but DB/Disk credentials exist
  if (!socket) {
    const restored = await restoreSessionDataFromDb(gym_id)
    const sessionDir = path.join(process.cwd(), 'sessions', `gym_${gym_id}`)
    const credsPath = path.join(sessionDir, 'creds.json')

    if (fs.existsSync(credsPath) || restored) {
      console.log(`🔌 Auto-reconnecting WhatsApp for gym_id: ${gym_id} before sending message...`)
      await createAndMonitorSocket(gym_id, null, false).catch(() => {})
      // Wait up to 6 seconds for connection to establish
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 500))
        socket = await getWhatsAppSocket(gym_id)
        if (socket) break
      }
    }
  }

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
 * Reconecta sesiones de WhatsApp que tengan credenciales guardadas en disco o en PostgreSQL.
 * Se llama automáticamente al arrancar el servidor.
 */
export async function reconectarSesionesActivas() {
  try {
    const res = await query(`
      SELECT gym_id, estado_conexion, session_data 
      FROM whatsapp_sessions 
      WHERE estado_conexion = 'CONECTADO' OR session_data IS NOT NULL
    `)

    if (res.rows.length === 0) {
      console.log('📂 No hay sesiones de WhatsApp para reconectar')
      return
    }

    console.log(`🔄 Reconectando ${res.rows.length} sesión(es) de WhatsApp desde DB...`)

    for (const row of res.rows) {
      const gymId = row.gym_id
      const restored = await restoreSessionDataFromDb(gymId)

      const sessionDir = path.join(process.cwd(), 'sessions', `gym_${gymId}`)
      const credsPath = path.join(sessionDir, 'creds.json')

      if (fs.existsSync(credsPath) || restored) {
        console.log(`🔄 Reconectando gym_id: ${gymId}...`)
        createAndMonitorSocket(gymId, null, false).catch(err =>
          console.error(`❌ Error reconectando gym_id ${gymId}: ${err.message}`)
        )
      } else {
        console.log(`⚠️ Sin credenciales para gym_id ${gymId}, ajustando estado a DESCONECTADO`)
        await query(
          `UPDATE whatsapp_sessions SET estado_conexion = 'DESCONECTADO', updated_at = NOW() WHERE gym_id = $1`,
          [gymId]
        )
      }
    }
  } catch (err) {
    console.error(`❌ Error reconectando sesiones activas: ${err.message}`)
  }
}

/**
 * Logs out and clears connection from memory, disk & PostgreSQL database.
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
       SET estado_conexion = 'DESCONECTADO', session_data = NULL, numero_telefono = NULL, updated_at = NOW() 
       WHERE gym_id = $1`,
      [gym_id]
    )
  } catch (dbErr) {
    console.warn(`⚠️ Could not reset DB state for gym_id ${gym_id}: ${dbErr.message}`)
  }
}
