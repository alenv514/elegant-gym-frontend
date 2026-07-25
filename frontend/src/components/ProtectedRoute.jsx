import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ requireRole }) {
  const { user, loading, isSubscriptionActive } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  // Show suspended screen if subscription expired
  if (!isSubscriptionActive) return <Navigate to="/suspended" replace />

  // saas_owner bypasses role restriction
  if (requireRole && user.rol !== requireRole && user.rol !== 'saas_owner') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
