import { createContext, useContext, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const auth = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginMode, setLoginMode] = useState('login') // 'login' | 'signup'

  // Open the login modal. Pass 'signup' to start on the signup tab.
  const openLogin  = (mode = 'login') => { setLoginMode(mode); setLoginOpen(true) }
  const closeLogin = () => setLoginOpen(false)

  // Run an action only if logged in, otherwise prompt login. Returns true if allowed.
  const requireAuth = () => {
    if (auth.isLoggedIn) return true
    openLogin('login')
    return false
  }

  const value = { ...auth, loginOpen, loginMode, openLogin, closeLogin, requireAuth }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => useContext(AuthContext)
