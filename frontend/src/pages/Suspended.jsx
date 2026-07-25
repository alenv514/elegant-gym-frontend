import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Suspended() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="login-page">
      <div className="login-bg-decoration" aria-hidden="true" />

      <div className="login-card fade-in" style={{ textAlign: 'center' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--danger-bg)',
          border: '1px solid rgba(224,82,82,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.375rem', color: 'var(--text)', marginBottom: '0.75rem' }}>
          Cuenta suspendida
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
          Tu acceso ha sido suspendido por falta de pago.<br />
          Contacta a soporte para reactivar tu cuenta.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <a
            href="https://wa.me/593999752932"
            className="btn btn-primary"
            id="btn-contact-support"
            style={{ justifyContent: 'center' }}
          >
            Contactar soporte
          </a>
          <button
            className="btn btn-ghost"
            onClick={handleLogout}
            id="btn-suspended-logout"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
