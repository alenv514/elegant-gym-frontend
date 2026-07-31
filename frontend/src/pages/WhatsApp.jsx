import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'

export default function WhatsApp() {
  const [status, setStatus] = useState(null)
  const [qrImage, setQrImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState('')
  const [qrExpired, setQrExpired] = useState(false)
  const [pairingMode, setPairingMode] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [pairingCode, setPairingCode] = useState(null)
  const [pairingLoading, setPairingLoading] = useState(false)
  const pollRef = useRef(null)
  const timeoutRef = useRef(null)

  // Clean helper to stop polling and timers
  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  // Load current connection status
  async function loadStatus() {
    try {
      const res = await api.get('/whatsapp/status')
      setStatus(res.data)
      return res.data
    } catch (err) {
      console.error('Error loading WhatsApp status:', err)
      setStatus({ status: 'DESCONECTADO' })
      return { status: 'DESCONECTADO' }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    return () => {
      stopPolling()
    }
  }, [])

  // Request QR code and start polling for connection
  async function handleConnect() {
    setConnecting(true)
    setError('')
    setQrImage(null)
    setQrExpired(false)
    setPairingMode(false)
    setPairingCode(null)

    try {
      const res = await api.get('/whatsapp/qr', { timeout: 30000 })

      if (res.data.image) {
        setQrImage(res.data.image)
        setConnecting(false)
        startPolling()
      } else if (res.data.status === 'CONECTADO') {
        setStatus({ status: 'CONECTADO', numero_telefono: res.data.numero_telefono })
        setConnecting(false)
      } else {
        setError(res.data.message || 'No se pudo generar el código QR. Intenta de nuevo.')
        setConnecting(false)
      }
    } catch (err) {
      console.error('Error requesting QR:', err)
      setError(err.response?.data?.error || 'Error al solicitar código QR. Intenta de nuevo.')
      setConnecting(false)
    }
  }

  // Request pairing code instead of QR
  async function handlePairing() {
    if (!phoneNumber.replace(/\D/g, '') || phoneNumber.replace(/\D/g, '').length < 10) {
      setError('Ingresa un número de teléfono válido (mínimo 10 dígitos)')
      return
    }

    setPairingLoading(true)
    setError('')
    setPairingCode(null)

    try {
      const res = await api.post('/whatsapp/pair', { phone: phoneNumber.replace(/\D/g, '') })
      setPairingCode(res.data.code)
      startPolling() // Poll for connection while user enters the code
    } catch (err) {
      console.error('Error requesting pairing code:', err)
      setError(err.response?.data?.error || 'Error al solicitar código de vinculación')
    } finally {
      setPairingLoading(false)
    }
  }

  // Poll status every 3 seconds to detect successful connection
  function startPolling() {
    stopPolling() // Kill any existing polling before starting fresh

    pollRef.current = setInterval(async () => {
      const data = await loadStatus()
      if (data.status === 'CONECTADO') {
        stopPolling()
        setQrImage(null)
        setQrExpired(false)
        setPairingCode(null)
        setPairingMode(false)
      }
    }, 3000)

    // Stop polling after 3 minutes
    timeoutRef.current = setTimeout(() => {
      if (pollRef.current) {
        stopPolling()
        setQrExpired(true)
        setError('Tiempo de espera agotado. El código expiró o no se vinculó a tiempo.')
      }
    }, 180000) // 3 minutes
  }

  // Disconnect WhatsApp
  async function handleDisconnect() {
    setDisconnecting(true)
    setError('')
    try {
      await api.post('/whatsapp/logout')
      setStatus({ status: 'DESCONECTADO', numero_telefono: null })
    } catch (err) {
      console.error('Error disconnecting:', err)
      setError(err.response?.data?.error || 'Error al desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  const isConnected = status?.status === 'CONECTADO'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">WhatsApp</h2>
          <p className="page-subtitle">Vincula tu número para enviar recordatorios automáticos</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--gold)' }}>Verificando estado de conexión...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '520px' }}>

          {/* ── Connection status card ── */}
          <div className="stat-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: isConnected ? 'var(--success)' : 'var(--danger)',
                boxShadow: isConnected ? '0 0 8px var(--success)' : '0 0 8px var(--danger)',
                flexShrink: 0,
                transition: 'all 0.3s ease',
              }} />
              <span style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)' }}>
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            {isConnected && status.numero_telefono && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                Número vinculado: <strong style={{ color: 'var(--success)' }}>{status.numero_telefono}</strong>
              </p>
            )}

            {isConnected ? (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Tu WhatsApp está activo. Los recordatorios de vencimiento se enviarán automáticamente a los miembros que tengan habilitada la opción.
                </p>

                <button
                  className="btn btn-ghost"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  style={{ color: 'var(--danger)' }}
                  id="btn-wa-disconnect"
                >
                  {disconnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Conecta tu número de WhatsApp personal para que el sistema envíe recordatorios automáticos de vencimiento a tus miembros.
                </p>

                {/* Show buttons only if not showing QR and not in pairing mode */}
                {!qrImage && !pairingMode && !pairingCode && !qrExpired && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleConnect}
                      disabled={connecting}
                      id="btn-wa-connect"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                      </svg>
                      {connecting ? 'Generando QR...' : 'Escanear código QR'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setPairingMode(true)
                        setError('')
                      }}
                      style={{ fontSize: '0.875rem' }}
                    >
                      🔑 Vincular con código de 8 dígitos
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Pairing Code Input ── */}
          {pairingMode && !pairingCode && !qrImage && (
            <div className="stat-card" style={{ padding: '1.5rem' }}>
              <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>
                🔑 Vincular con código
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                Ingresa tu número de WhatsApp (con código de país, sin espacios ni signos).
                Ejemplo: <strong>593999752932</strong>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="tel"
                  className="input"
                  placeholder="Ej: 593999752932"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{ padding: '0.75rem 1rem', fontSize: '1rem', textAlign: 'center' }}
                  maxLength={15}
                  disabled={pairingLoading}
                />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handlePairing}
                    disabled={pairingLoading || !phoneNumber.replace(/\D/g, '')}
                    style={{ flex: 1 }}
                  >
                    {pairingLoading ? 'Generando código...' : 'Obtener código'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setPairingMode(false)
                      setError('')
                    }}
                    disabled={pairingLoading}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Pairing Code Display ── */}
          {pairingCode && (
            <div className="stat-card" style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '1rem' }}>
                Código de vinculación
              </p>
              <div style={{
                background: 'var(--bg-card)',
                border: '2px solid var(--gold)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem 2.5rem',
                display: 'flex',
                gap: '0.5rem',
                letterSpacing: '0.5em',
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--gold)',
                fontFamily: 'monospace',
              }}>
                {pairingCode.split('').map((char, i) => (
                  <span key={i}>{char}</span>
                ))}
              </div>
              <ol style={{
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
                lineHeight: 1.7,
                paddingLeft: '1.25rem',
                margin: 0,
              }}>
                <li>Abre <strong>WhatsApp</strong> en tu celular</li>
                <li>Toca <strong>Menú ⋮</strong> → <strong>Dispositivos vinculados</strong></li>
                <li>Toca <strong>Vincular un dispositivo</strong></li>
                <li>En la parte inferior, toca <strong>Vincular usando número de teléfono</strong></li>
                <li>Ingresa este código de 8 dígitos</li>
              </ol>
              <p style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                El código expira en 3 minutos
              </p>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  stopPolling()
                  setPairingCode(null)
                  setPairingMode(false)
                  setError('')
                }}
                style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* ── QR Code display ── */}
          {qrImage && (
            <div className="stat-card" style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '1rem' }}>
                Escanea el código QR
              </p>
              <div style={{
                background: '#fff',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                display: 'inline-block',
                animation: 'fadeIn 0.3s ease',
              }}>
                <img
                  src={qrImage}
                  alt="Código QR de WhatsApp"
                  style={{ width: 240, height: 240, display: 'block' }}
                />
              </div>
              <ol style={{
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
                lineHeight: 1.7,
                paddingLeft: '1.25rem',
                margin: 0,
              }}>
                <li>Abre <strong>WhatsApp</strong> en tu celular</li>
                <li>Toca <strong>Menú ⋮</strong> → <strong>Dispositivos vinculados</strong></li>
                <li>Toca <strong>Vincular un dispositivo</strong></li>
                <li>Apunta la cámara hacia este código QR</li>
              </ol>
              <p style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                El código expira en 2 minutos
              </p>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  stopPolling()
                  setQrImage(null)
                  setQrExpired(false)
                  setError('')
                }}
                style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* ── QR expired ── */}
          {qrExpired && !qrImage && !pairingCode && (
            <div className="stat-card" style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                ⏱️ El código ha expirado
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleConnect}
                  disabled={connecting}
                >
                  {connecting ? 'Generando QR...' : 'Generar nuevo QR'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setQrExpired(false)
                    setPairingMode(true)
                  }}
                  style={{ fontSize: '0.875rem' }}
                >
                  🔑 Usar código
                </button>
              </div>
            </div>
          )}

          {/* ── Error message ── */}
          {error && !qrImage && !pairingCode && (
            <p className="input-error-msg" style={{ textAlign: 'center' }}>{error}</p>
          )}

          {/* ── Loading spinner ── */}
          {connecting && !qrImage && !qrExpired && (
            <div className="stat-card" style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <div style={{
                width: 32,
                height: 32,
                border: '3px solid var(--gold-subtle)',
                borderTopColor: 'var(--gold)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Generando código...
              </p>
              <button
                className="btn btn-ghost"
                onClick={() => setConnecting(false)}
                style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* ── Info card ── */}
          <div style={{
            background: 'var(--gold-subtle)',
            border: '1px solid var(--gold-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
          }}>
            <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              ℹ️ ¿Cómo funcionan los recordatorios?
            </p>
            <ul style={{
              color: 'var(--text-muted)',
              fontSize: '0.8125rem',
              lineHeight: 1.7,
              paddingLeft: '1.25rem',
              margin: 0,
            }}>
              <li>Se envían automáticamente todos los días a las 8:00 AM</li>
              <li>Notifican al miembro el día exacto en que vence su membresía</li>
              <li>Solo se envían a miembros con WhatsApp habilitado</li>
              <li>Recibirás un resumen diario con el total de mensajes enviados</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
