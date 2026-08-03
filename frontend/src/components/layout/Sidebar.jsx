import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

// ─── Icons (inline SVG — no extra dep) ───────────────────
const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  members: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
    </svg>
  ),
  classes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  payments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
}

const gymNavItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: icons.dashboard  },
  { to: '/members',   label: 'Miembros',   icon: icons.members    },
  { to: '/classes',   label: 'Clases',     icon: icons.classes    },
  { to: '/payments',  label: 'Pagos',      icon: icons.payments   },
  { to: '/whatsapp',  label: 'WhatsApp',   icon: icons.whatsapp   },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showTerms, setShowTerms] = useState(false)

  const initials = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Navegación principal">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-name gold-text">Elegant</div>
          <div className="sidebar-logo-name" style={{ color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
            for Gym
          </div>
          <div className="sidebar-logo-sub">{user?.gym_nombre || 'Sistema de gestión'}</div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" aria-label="Menú">
          <span className="nav-section-label">Principal</span>

          {gymNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {/* Admin-only section */}
          {user?.rol === 'saas_owner' && (
            <>
              <span className="nav-section-label" style={{ marginTop: '0.5rem' }}>
                Administración
              </span>
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                {icons.admin}
                Panel SaaS
              </NavLink>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="truncate" style={{ flex: 1 }}>
              <div className="sidebar-user-name truncate">{user?.nombre || 'Usuario'}</div>
              <div className="sidebar-user-role">{user?.rol?.replace('_', ' ')}</div>
            </div>
          </div>
          <button
            className="nav-item btn-ghost"
            onClick={handleLogout}
            style={{ marginTop: '0.25rem', color: 'var(--danger)' }}
            id="btn-logout"
          >
            {icons.logout}
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={() => setShowTerms(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-faint, rgba(255, 255, 255, 0.2))',
              fontSize: '0.62rem',
              marginTop: '0.4rem',
              cursor: 'pointer',
              opacity: 0.4,
              width: '100%',
              textAlign: 'center',
              textDecoration: 'underline'
            }}
          >
            Términos SaaS
          </button>
        </div>
      </aside>

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
                <strong>1. Titularidad y Propiedad Intelectual:</strong> La plataforma de gestión y software <em>"Elegant for Gym"</em> es un servicio propiedad intelectual exclusiva del desarrollador <strong>Alen (Proveedor y Dueño del SaaS)</strong>. Todos los derechos sobre el código fuente, diseño, bases de datos e infraestructura pertenecen en su totalidad al Proveedor.
              </p>
              <p>
                <strong>2. Modalidad de Alquiler (SaaS):</strong> El acceso a la plataforma se concede a los gimnasios bajo la modalidad de <strong>licencia de alquiler mensual (Software as a Service)</strong>. La contratación no transfiere propiedad del software, únicamente el derecho de uso durante la vigencia del alquiler pagado.
              </p>
              <p>
                <strong>3. Suspensión del Servicio:</strong> El servicio requiere el pago puntual de la tarifa mensual de alquiler. En caso de mora en el pago transcurrido el período de gracia otorgado (2 días), el acceso a la plataforma será suspendido automáticamente por el sistema hasta la regularización de la suscripción.
              </p>
              <p>
                <strong>4. Uso y Responsabilidad:</strong> El cliente es responsable de la confidencialidad de sus credenciales y de los datos ingresados en su cuenta.
              </p>
              <p>
                <strong>5. Aceptación Implícita:</strong> El inicio de sesión y el uso continuado de la plataforma constituyen la aceptación explícita de estos términos.
              </p>
            </div>

            <div className="modal-footer" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowTerms(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Export icons so other components can use them without creating duplicates
export { icons }
