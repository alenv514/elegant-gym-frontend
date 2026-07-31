import cron from 'node-cron'
import { query } from '../config/db.js'
import { sendWhatsAppMessage, sendViaBaileys } from '../utils/whatsappManager.js'

// ─── Asegurar que la tabla de logs exista ─────────────────────────────────

async function asegurarTablaLogs() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS recordatorios_log (
        id SERIAL PRIMARY KEY,
        gym_id INT NOT NULL,
        member_id INT NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(10) NOT NULL,
        mensaje TEXT,
        error_msg TEXT
      )
    `)
    console.log('📋 Tabla recordatorios_log lista')
    await limpiarHistorialAntiguo()
  } catch (err) {
    console.warn('⚠️ No se pudo crear recordatorios_log:', err.message)
  }
}

/**
 * Elimina automáticamente registros de historial con más de 2 días de antigüedad.
 */
export async function limpiarHistorialAntiguo() {
  try {
    const res = await query(
      `DELETE FROM recordatorios_log WHERE fecha_envio < NOW() - INTERVAL '2 days'`
    )
    if (res.rowCount > 0) {
      console.log(`🧹 Limpieza automática: Se eliminaron ${res.rowCount} registro(s) de recordatorios_log (> 2 días).`)
    }
  } catch (err) {
    console.warn('⚠️ Error en limpieza automática de recordatorios_log:', err.message)
  }
}

// ─── Mensajes ───────────────────────────────────────────────────────────────

function msgPorVencer(nombre, gymNombre) {
  return `👋 *Hola ${nombre}!*\n\n` +
    `Te recordamos que tu membresía en *${gymNombre}* vence en *2 días*. 📅\n\n` +
    `Renueva a tiempo para seguir disfrutando de tus entrenamientos sin interrupción. 💪🔥\n\n` +
    `🙌 Te esperamos!\n` +
    `*${gymNombre}*`
}

function msgVenceHoy(nombre, gymNombre) {
  return `👋 *Hola ${nombre}!*\n\n` +
    `Te recordamos que tu membresía en *${gymNombre}* vence *hoy*. 📅\n\n` +
    `Renueva hoy mismo para seguir disfrutando de tus entrenamientos sin interrupción. 💪🔥\n\n` +
    `*${gymNombre}*`
}

function msgVencido(nombre, gymNombre) {
  return `👋 *Hola ${nombre}!*\n\n` +
    `Tu membresía en *${gymNombre}* ha *vencido*. ⏰\n\n` +
    `¡Aún estás a tiempo de renovar y no perder tus progresos! 💪💥\n\n` +
    `Acércate a recepción o escríbenos para regularizar tu situación. 📞\n\n` +
    `*${gymNombre}*`
}

// ─── Lógica principal ───────────────────────────────────────────────────────

/**
 * Obtiene todos los gimnasios que tienen WhatsApp conectado y suscripción activa.
 */
async function getGymsConectados() {
  const result = await query(`
    SELECT g.id, g.nombre
    FROM gyms g
    JOIN whatsapp_sessions ws ON ws.gym_id = g.id
    WHERE ws.estado_conexion = 'CONECTADO'
      AND g.suscripcion_activa = true
  `)
  return result.rows
}

/**
 * Procesa los recordatorios para un gimnasio específico.
 * Devuelve un resumen de lo que se hizo.
 */
async function procesarGimnasio(gym) {
  console.log(`⏰ Procesando recordatorios para: ${gym.nombre} (ID: ${gym.id})`)

  const resumen = {
    gym: gym.nombre,
    por_vencer: { encontrados: 0, enviados: 0, fallidos: 0 },
    vence_hoy: { encontrados: 0, enviados: 0, fallidos: 0 },
    vencidos: { encontrados: 0, enviados: 0, fallidos: 0 }
  }

  // ── Único Recordatorio: Miembros que vencen HOY ──
  const venceHoy = await query(`
    SELECT m.id, m.nombre, m.telefono
    FROM members m
    WHERE m.gym_id = $1
      AND m.opt_in_whatsapp = true
      AND m.fecha_vencimiento = CURRENT_DATE
  `, [gym.id])

  console.log(`   → ${venceHoy.rows.length} miembro(s) vencen hoy`)
  resumen.vence_hoy.encontrados = venceHoy.rows.length

  for (const member of venceHoy.rows) {
    const ok = await enviarYLoggear(
      gym.id, member, 'VENCE_HOY',
      msgVenceHoy(member.nombre, gym.nombre), gym.nombre
    )
    if (ok) resumen.vence_hoy.enviados++
    else resumen.vence_hoy.fallidos++
    await new Promise(r => setTimeout(r, 200))
  }

  // ── Notificación de resumen al dueño del gimnasio ──
  if (resumen.vence_hoy.enviados > 0) {
    try {
      const ownerRes = await query(
        `SELECT numero_telefono FROM whatsapp_sessions WHERE gym_id = $1 AND numero_telefono IS NOT NULL LIMIT 1`,
        [gym.id]
      )
      const ownerPhone = ownerRes.rows[0]?.numero_telefono
      if (ownerPhone) {
        const summaryMsg = `📊 *Resumen de Recordatorios — ${gym.nombre}*\n\n` +
          `Se enviaron ${resumen.vence_hoy.enviados} recordatorios de vencimiento de hoy.\n\n` +
          `Revisa el historial completo en tu panel web.`

        await sendViaBaileys(gym.id, ownerPhone, summaryMsg).catch(e => console.warn(`⚠️ Resumen al dueño falló: ${e.message}`))
      }
    } catch (sErr) {
      console.warn(`⚠️ No se pudo enviar mensaje de resumen al dueño: ${sErr.message}`)
    }
  }

  return resumen
}

/**
 * Envía un mensaje WhatsApp y registra el resultado en recordatorios_log.
 * Retorna true si se envió correctamente, false si falló.
 */
async function enviarYLoggear(gymId, member, tipo, mensaje, gymNombre = 'Tu Gimnasio') {
  try {
    const diasText = tipo === 'POR_VENCER_2_DIAS' ? 'vence en 2 días' : tipo === 'VENCE_HOY' ? 'vence hoy' : 'ya venció'
    await sendWhatsAppMessage(gymId, member.telefono, mensaje, {
      nombre: member.nombre,
      gymNombre: gymNombre,
      dias: diasText
    })

    await query(
      `INSERT INTO recordatorios_log (gym_id, member_id, tipo, estado, mensaje)
       VALUES ($1, $2, $3, 'ENVIADO', $4)`,
      [gymId, member.id, tipo, mensaje]
    )

    console.log(`   ✅ ${tipo} → ${member.nombre} (${member.telefono})`)
    return true
  } catch (err) {
    console.error(`   ❌ ${tipo} → ${member.nombre}: ${err.message}`)

    try {
      await query(
        `INSERT INTO recordatorios_log (gym_id, member_id, tipo, estado, mensaje, error_msg)
         VALUES ($1, $2, $3, 'FALLIDO', $4, $5)`,
        [gymId, member.id, tipo, mensaje, err.message]
      )
    } catch (logErr) {
      console.warn(`⚠️ No se pudo registrar el fallo en la BD: ${logErr.message}`)
    }
    return false
  }
}

// ─── Inicialización ─────────────────────────────────────────────────────────

/**
 * Inicia el cron job de recordatorios automáticos.
 * Se ejecuta todos los días a las 09:00 AM (hora del servidor).
 */
export { procesarGimnasio }

export async function iniciarRecordatorios() {
  await asegurarTablaLogs()
  console.log('⏰ Programando recordatorios automáticos para las 8:00 AM...')

  const task = cron.schedule('0 8 * * *', async () => {
    console.log('⏰═══════════════════════════════════════════')
    console.log('⏰ Ejecutando recordatorios automáticos...')
    console.log(`⏰ Fecha: ${new Date().toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' })}`)
    console.log('⏰═══════════════════════════════════════════')

    try {
      const gyms = await getGymsConectados()
      console.log(`⏰ Gimnasios conectados: ${gyms.length}`)

      for (const gym of gyms) {
        await procesarGimnasio(gym)
      }

      console.log('⏰═══════════════════════════════════════════')
      console.log('✅ Recordatorios completados.')
      console.log('⏰═══════════════════════════════════════════')
    } catch (err) {
      console.error('❌ Error en ciclo de recordatorios:', err.message)
    }
  })

  console.log('✅ Recordatorios programados (8:00 AM todos los días)')
  return task
}


