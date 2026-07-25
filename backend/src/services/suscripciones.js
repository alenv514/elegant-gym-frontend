import cron from 'node-cron'
import { query } from '../config/db.js'

async function asegurarTabla() {
  await query(`
    CREATE TABLE IF NOT EXISTS saas_suspension_log (
      id SERIAL PRIMARY KEY,
      gym_id INT REFERENCES gyms(id) ON DELETE CASCADE,
      fecha_suspension DATE NOT NULL DEFAULT CURRENT_DATE,
      fecha_reactivacion DATE,
      motivo TEXT
    )
  `)
}

export async function iniciarVerificacionSuscripciones() {
  await asegurarTabla()

  console.log('⏰ Programando verificación automática de suscripciones SaaS...')

  cron.schedule('0 9 * * *', async () => {
    console.log('⏰═══════════════════════════════════════════')
    console.log('⏰ Verificando suscripciones de gyms...')

    const result = await query(`
      UPDATE gyms
      SET suscripcion_activa = false
      WHERE suscripcion_activa = true
        AND fecha_vencimiento + dias_gracia < CURRENT_DATE
      RETURNING id, nombre, fecha_vencimiento, dias_gracia
    `)

    for (const gym of result.rows) {
      await query(
        `INSERT INTO saas_suspension_log (gym_id, fecha_suspension, motivo)
         VALUES ($1, CURRENT_DATE, $2)`,
        [gym.id, `Vencimiento: ${gym.fecha_vencimiento} + ${gym.dias_gracia} días de gracia`]
      )
      console.log(`   ❌ ${gym.nombre} → Suspendido por falta de pago`)
    }

    console.log(`   ${result.rows.length === 0 ? '✅ Ningún gym requiere suspensión' : `✅ ${result.rows.length} gym(s) suspendidos`}`)
    console.log('⏰═══════════════════════════════════════════')
  })

  console.log('✅ Verificación de suscripciones programada (09:00 AM todos los días)')
}

