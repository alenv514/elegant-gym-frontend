import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar, { icons } from './Sidebar'

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
        </header>

        {/* Page content via React Router Outlet */}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
