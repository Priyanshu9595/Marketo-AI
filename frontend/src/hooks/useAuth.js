import { useState, useEffect } from 'react'

export function useAuth() {
  const [user,  setUser]  = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    setReady(true)
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user',  JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('marketo_active_page')
    setUser(null)
  }

  const isLoggedIn = !!user

  return { user, login, logout, isLoggedIn, ready }
}