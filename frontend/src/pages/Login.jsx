import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  function onChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/auth/login', form)
      login(data.user, data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-decoration" aria-hidden="true" />

      <div className="login-card fade-in">
        {/* Logo */}
        <div className="login-logo">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--gold-dim), var(--gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: 'var(--shadow-gold)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 4v16M18 4v16M3 8h4M17 8h4M3 16h4M17 16h4M7 12h10"/>
            </svg>
          </div>
          <h1 className="login-title gold-text">Elegant</h1>
          <p className="login-subtitle">for Gym</p>
          <p style={{ color: 'var(--text-faint)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            Sistema de gestión
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="form-grid" noValidate>
          <div className="input-group">
            <label className="input-label" htmlFor="login-email">Correo electrónico</label>
            <div className="input-with-icon">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
              </svg>
              <input
                id="login-email"
                className="input"
                type="email"
                name="email"
                placeholder="tu@gym.com"
                value={form.email}
                onChange={onChange}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="login-password">Contraseña</label>
            <div className="input-with-icon">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="login-password"
                className="input"
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={onChange}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button
            id="btn-login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: '0.5rem', width: '100%', padding: '0.875rem' }}
          >
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <p className="login-footer-note">
            ¿Problemas para acceder? Contacta al soporte.
          </p>
          <button
            type="button"
            onClick={() => setShowTerms(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-faint, rgba(255, 255, 255, 0.25))',
              fontSize: '0.65rem',
              marginTop: '0.5rem',
              cursor: 'pointer',
              opacity: 0.5,
              textDecoration: 'underline'
            }}
          >
            Términos y Condiciones de Servicio
          </button>
        </div>
      </div>

      {/* Modal discreto de Términos y Condiciones SaaS */}
      {showTerms && (
        <div
          className="modal-overlay"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setShowTerms(false)}
        >
          <div
            className="modal"
            style={{ maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <span className="modal-title" style={{ fontSize: '1rem' }}>📋 Términos y Condiciones de Servicio (SaaS)</span>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowTerms(false)}>×</button>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p>
                <strong>1. Titularidad del Software e Infraestructura:</strong> La presente plataforma informática, incluyendo su código fuente, arquitectura de software, diseño de interfaz, motores de automatización, base de datos y desarrollo técnico, es propiedad intelectual y desarrollo tecnológico exclusivo de <strong>Alen (Proveedor SaaS)</strong>. La denominación <em>"Elegant for Gym"</em> corresponde al nombre comercial asignado a la aplicación a solicitud del cliente, lo cual no concede ni transfiere derechos de propiedad sobre la tecnología, plataforma o código del software.
              </p>
              <p>
                <strong>2. Modalidad de Licencia de Alquiler (SaaS):</strong> El derecho de uso de la aplicación se concede a los establecimientos clientes única y exclusivamente bajo la modalidad de <strong>Licencia de Alquiler de Software como Servicio (SaaS)</strong>, de carácter temporal, renovable y no exclusivo. La contratación del servicio no constituye bajo ningún concepto venta, cesión o transferencia de los derechos de autor de la herramienta tecnológica.
              </p>
              <p>
                <strong>3. Continuidad del Servicio y Suspensión por Mora:</strong> La validez del acceso y funcionamiento de la aplicación está supeditada al pago puntual de la tarifa mensual de alquiler de software. En caso de mora en el pago transcurrido el período de gracia otorgado por el sistema (2 días), el Proveedor (<strong>Alen</strong>) queda expresamente facultado para suspender el servicio y el acceso a la plataforma hasta la cancelación de los valores adeudados.
              </p>
              <p>
                <strong>4. Confidencialidad y Gestión de Información:</strong> El gimnasio cliente es el único responsable de la custodia de sus credenciales de acceso y del tratamiento de la información de sus usuarios y registros internos.
              </p>
              <p>
                <strong>5. Aceptación Implícita:</strong> El inicio de sesión, autenticación de usuario o uso continuado de la plataforma implica la aceptación tácita, plena e incondicional de los presentes Términos y Condiciones de Servicio.
              </p>
            </div>

            <div className="modal-footer" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowTerms(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
