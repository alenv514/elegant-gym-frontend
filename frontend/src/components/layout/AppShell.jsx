import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar, { icons } from './Sidebar'
import useInstallPWA from '../../utils/useInstallPWA'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/members':   'Miembros',
  '/classes':   'Clases',
  '/payments':  'Pagos',
  '/whatsapp':  'WhatsApp',
  '/admin':     'Administración SaaS',
}

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { canInstall, isIOS, isInstalled, install } = useInstallPWA()

  const title = Object.entries(pageTitles).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] ?? 'Elegant for Gym'

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        {/* Topbar */}
        <header className="topbar" role="banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Abrir menú"
              id="btn-menu-toggle"
            >
              <span style={{ width: 20, height: 20 }}>{icons.menu}</span>
            </button>
            <h1 className="topbar-title">{title}</h1>
          </div>

          {/* PWA Install Button */}
          <div className="topbar-actions">
            {canInstall && (
              <button className="btn-install-pwa" onClick={install} title="Instalar app">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Instalar App</span>
              </button>
            )}
            {!canInstall && isIOS && !isInstalled && (
              <button className="btn-install-pwa btn-install-pwa--ios" title="Cómo instalar en iOS">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Compartir → Pantalla Inicio</span>
              </button>
            )}
          </div>
        </header>

        {/* Page content via React Router Outlet */}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
