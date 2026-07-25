/**
 * Calcula la fecha de vencimiento de una membresía sumando meses calendario
 * en vez de días exactos, para que respete el mismo día del mes siguiente.
 *
 * Ejemplo: si pagó el 30 de marzo, vence el 30 de abril, NO el 29 de abril.
 *
 * Maneja el overflow: si el mes siguiente tiene menos días (ej: 31 de enero → febrero),
 * se usa el último día del mes (28/29 de febrero).
 *
 * @param {Date|string} baseDate - Fecha base (inicio o último vencimiento)
 * @param {number} duracionDias - Duración del plan en días (30, 60, 365, etc.)
 * @returns {Date} Nueva fecha de vencimiento
 */
export function calcularVencimiento(baseDate, duracionDias) {
  const fecha = new Date(baseDate)
  const diaOriginal = fecha.getDate()

  // Convertir días a meses aproximados (30 días ≈ 1 mes)
  const meses = Math.round(duracionDias / 30)
  fecha.setMonth(fecha.getMonth() + meses)

  // Si el día cambió significa que hubo overflow (ej: 31 enero + 1 mes → JS da marzo 3)
  // En ese caso, usar el último día del mes anterior
  if (fecha.getDate() !== diaOriginal) {
    fecha.setDate(0) // Último día del mes anterior
  }

  return fecha
}
