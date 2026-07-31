const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1161355993738614'
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAXZBqw3dlEIBSIM2i1BXfKrE2TdZBqM70zjl7s4h7QgY9Yf5d1HwooGLKtGyfXbOUSACCSMrM1AdiRFjz1jaX3OIyT40qroJoTDWP97M1PZBOh1deZBhadEzHackEk6pgPyCr0APe5uAlClJGBtTNu6NPjueYSIO9Mr4pMxyZAs8xPrwer3L3iMhW2ZCNXzRB2wZDZD'

/**
 * Sends a message using Meta's Official WhatsApp Cloud API.
 * Only works if a template is approved ('recordatorio_membresia').
 * Primary channel for reminders is Baileys (whatsappManager.js).
 * 
 * @param {string} to - Recipient phone number (e.g. 593999752932)
 * @param {string} text - Message content (unused in template mode, kept for fallback compatibility)
 * @param {object} [params] - Dynamic parameters { nombre, gymNombre }
 * @returns {Promise<object>} Meta API response JSON
 */
export async function sendMetaWhatsAppMessage(to, text, params = null) {
  let cleanTo = (to || '').replace(/\D/g, '')
  if (!cleanTo) throw new Error('Número de teléfono inválido')

  // Auto-format local Ecuador numbers (0991234567 -> 593991234567)
  if (cleanTo.startsWith('0')) {
    cleanTo = '593' + cleanTo.substring(1)
  }

  const url = `https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`

  // Template 'recordatorio_membresia' (Servicio) — 2 variables: {{1}} nombre, {{2}} gimnasio
  const templateParams = params ? [
    { type: 'text', text: params.nombre || 'Estimado socio' },
    { type: 'text', text: params.gymNombre || 'Tu Gimnasio' }
  ] : [
    { type: 'text', text: 'Estimado socio' },
    { type: 'text', text: 'Tu Gimnasio' }
  ]
  const payload = {
    messaging_product: 'whatsapp',
    to: cleanTo,
    type: 'template',
    template: {
      name: 'recordatorio_membresia',
      language: { code: 'es_ES' },
      components: [
        {
          type: 'body',
          parameters: templateParams
        }
      ]
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json()

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message || data.error?.error_data?.details || JSON.stringify(data)
    throw new Error(`Error Meta Cloud API: ${errorMsg}`)
  }

  const msgId = data.messages?.[0]?.id
  console.log(`✉️  [META API OFICIAL] Message sent to ${cleanTo} (ID: ${msgId})`)
  return data
}