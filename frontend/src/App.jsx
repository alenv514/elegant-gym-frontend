import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/layout/AppShell'

import Login       from './pages/Login'
import Suspended   from './pages/Suspended'
import Dashboard   from './pages/Dashboard'
import Members     from './pages/Members'
import MemberDetail from './pages/MemberDetail'
import Classes     from './pages/Classes'
import Payments    from './pages/Payments'
import WhatsAppPage from './pages/WhatsApp'
import Admin       from './pages/Admin'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"     element={<Login />} />
          <Route path="/suspended" element={<Suspended />} />

          {/* Protected — all gym routes share the AppShell layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"      element={<Dashboard />} />
              <Route path="/members"        element={<Members />} />
              <Route path="/members/:id"    element={<MemberDetail />} />
              <Route path="/classes"        element={<Classes />} />
              <Route path="/payments"       element={<Payments />} />
              <Route path="/whatsapp"       element={<WhatsAppPage />} />

              {/* Admin-only */}
              <Route element={<ProtectedRoute requireRole="saas_owner" />}>
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
