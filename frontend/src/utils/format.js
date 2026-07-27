/**
 * Formatea una fecha de la base de datos (DATE/UTC) a formato DD/MM/AAAA.
 * Evita el desplazamiento por zona horaria local (ej. UTC-5 en Ecuador).
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  
  const day = date.getUTCDate()
  const month = date.getUTCMonth() + 1
  const year = date.getUTCFullYear()
  
  return `${day}/${month}/${year}`
}
