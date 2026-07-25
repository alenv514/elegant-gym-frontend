import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN
const VERSION  = process.env.WHATSAPP_VERSION || 'v20.0'

const BASE_URL = `https://graph.facebook.com/${VERSION}/${PHONE_ID}`

/**
 * Sanitizes phone numbers to WhatsApp format (digits only).
 * e.g., "+593 99-975-2932" -> "593999752932"
 */
export function sanitizePhone(phone) {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Sends a single text message to a client using the Meta WhatsApp Cloud API.
 * 
 * @param {string} to - Recipient phone number (unformatted or formatted)
 * @param {string} text - Message body
 */
export async function sendWhatsAppMessage(to, text) {
  const cleanTo = sanitizePhone(to)
  if (!cleanTo) throw new Error('Número de teléfono inválido')

  if (!PHONE_ID || !TOKEN) {
    console.warn('⚠️ WhatsApp API credentials missing. Logging message instead:', { to: cleanTo, text })
    return { mock: true, success: true }
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/messages`,
      {
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return response.data
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Enqueues and sends multiple messages with random delay to avoid spam detection.
 * 
 * @param {Array<{to: string, text: string}>} queue - Array of message objects
 * @param {function} onSent - Callback executed after each message sent (for logging)
 */
export async function sendWhatsAppQueue(queue, onSent) {
  console.log(`🚀 Starting WhatsApp queue send for ${queue.length} messages...`)

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i]
    
    // Implement random delay between 12s and 28s as per requirement #4
    if (i > 0) {
      const delay = Math.floor(Math.random() * (28000 - 12000 + 1)) + 12000
      console.log(`⏱️ Waiting ${Math.round(delay/1000)} seconds before next message...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    try {
      const result = await sendWhatsAppMessage(item.to, item.text)
      if (onSent) await onSent(item, true, null, result)
    } catch (err) {
      if (onSent) await onSent(item, false, err.response?.data || err.message, null)
    }
  }

  console.log('✅ Finished processing WhatsApp queue.')
}
