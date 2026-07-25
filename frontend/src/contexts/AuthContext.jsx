import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Rehydrate session from localStorage on app boot
  useEffect(() => {
    const stored = localStorage.getItem('efg_user')
    const token  = localStorage.getItem('efg_token')
    if (stored && token) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  function login(userData, token) {
    localStorage.setItem('efg_user',  JSON.stringify(userData))
    localStorage.setItem('efg_token', token)
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('efg_user')
    localStorage.removeItem('efg_token')
    setUser(null)
  }

  // Expose subscription status check — used by ProtectedRoute
  const isSubscriptionActive = user?.suscripcion_activa !== false

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isSubscriptionActive }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
