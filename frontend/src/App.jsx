import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import CopyGenerator from './pages/CopyGenerator'
import ImageGen from './pages/ImageGen'
import VideoAds from './pages/VideoAds'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Button from './components/Button'
import { useAuthContext } from './context/AuthContext'
import { useReminders } from './hooks/useReminders'

const PAGES = {
  dashboard: Dashboard,
  calendar:  Calendar,
  copy:      CopyGenerator,
  image:     ImageGen,
  video:     VideoAds,
  settings:  Settings,
}

export default function App() {
  // Remember the last-visited page so a refresh stays put instead of going home
  const [active, setActive] = useState(() => {
    const saved = localStorage.getItem('active_page')
    return saved && PAGES[saved] ? saved : 'dashboard'
  })
  const { isLoggedIn, ready, user, logout, openLogin, loginOpen } = useAuthContext()
  const Page = PAGES[active] || Dashboard

  useReminders() // app-wide post reminders (fires ~1h before scheduled posts)

  // Apply the saved font-size scale on load
  useEffect(() => {
    document.documentElement.style.zoom = localStorage.getItem('font_scale') || '1'
  }, [])

  // Persist the active page and navigate
  const navigate = (id) => {
    setActive(id)
    localStorage.setItem('active_page', id)
  }

  if (!ready) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar active={active} onNavigate={navigate} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
          padding: '14px 40px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
        }}>
          {isLoggedIn ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--accent-soft)', color: 'var(--accent-mid)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                }}>
                  {(user?.name || user?.user_metadata?.name || user?.email || '?').charAt(0)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {user?.name || user?.user_metadata?.name || user?.email}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => openLogin('login')}>Log in</Button>
              <Button size="sm" onClick={() => openLogin('signup')}>Sign up</Button>
            </>
          )}
        </header>

        <main style={{ flex: 1, padding: '32px 40px', overflowX: 'hidden' }}>
          <Page />
        </main>
      </div>

      {/* Login / signup modal */}
      {loginOpen && <Login />}
    </div>
  )
}
