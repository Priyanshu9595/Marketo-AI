import { useCallback, useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import CopyGenerator from './pages/CopyGenerator'
import ImageGen from './pages/ImageGen'
import VideoAds from './pages/VideoAds'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Home from './pages/Home'
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

const NOTIFICATIONS_KEY = 'marketo_notifications'
const AUTO_REFRESH_MS = 10000

export default function App() {
  const [active, setActive] = useState(() => {
    const saved = localStorage.getItem('active_page')
    return saved && PAGES[saved] ? saved : 'dashboard'
  })
  const [reminderPopup, setReminderPopup] = useState(null)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]')
    } catch {
      return []
    }
  })
  const { isLoggedIn, ready, user, logout, openLogin, loginOpen } = useAuthContext()
  const Page = PAGES[active] || Dashboard

  const addNotification = useCallback((notification) => {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      ...notification,
    }

    setReminderPopup(item)
    setNotifications(prev => {
      const next = [item, ...prev].slice(0, 50)
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearNotifications = () => {
    setNotifications([])
    localStorage.removeItem(NOTIFICATIONS_KEY)
  }

  useReminders(addNotification) // app-wide post reminders (fires ~1h before scheduled posts)

  useEffect(() => {
    if (!reminderPopup) return
    const timer = setTimeout(() => setReminderPopup(null), 12000)
    return () => clearTimeout(timer)
  }, [reminderPopup])

  useEffect(() => {
    const showReminder = (event) => addNotification(event.detail)
    window.addEventListener('marketo-reminder-popup', showReminder)
    return () => window.removeEventListener('marketo-reminder-popup', showReminder)
  }, [addNotification])

  useEffect(() => {
    if (!notificationOpen) return

    const closeTimer = setTimeout(() => setNotificationOpen(false), 5000)
    const closeOnOutsideClick = (event) => {
      if (!event.target.closest?.('[data-notification-center="true"]')) {
        setNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => {
      clearTimeout(closeTimer)
      document.removeEventListener('mousedown', closeOnOutsideClick)
    }
  }, [notificationOpen])

  useEffect(() => {
    if (!isLoggedIn) return
    const refresh = () => {
      window.dispatchEvent(new Event('marketo-auto-refresh'))
      window.dispatchEvent(new Event('marketo-check-reminders'))
    }
    const timer = setInterval(refresh, AUTO_REFRESH_MS)
    return () => clearInterval(timer)
  }, [isLoggedIn])

  // Apply the saved font-size scale on load
  useEffect(() => {
    document.documentElement.style.zoom = localStorage.getItem('font_scale') || '1'
  }, [])

  // Persist the active page and navigate
  const navigate = (id) => {
    setActive(id)
    localStorage.setItem('active_page', id)
    setSidebarOpen(false)
  }

  if (!ready) return null

  if (!isLoggedIn) {
    return (
      <>
        <Home
          onLogin={() => openLogin('login')}
          onSignup={() => openLogin('signup')}
        />
        {loginOpen && <Login />}
      </>
    )
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} style={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>
      <Sidebar active={active} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />}
      <div className="app-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header className="app-topbar" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '14px 40px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--surface)',
          backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)', zIndex: 10,
        }}>
          <button
            type="button"
            className="sidebar-toggle-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            title="Open menu"
          >
            <span />
            <span />
            <span />
          </button>
          {isLoggedIn ? (
            <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <div data-notification-center="true" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setNotificationOpen(open => !open)}
                  title="Notifications"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: notificationOpen ? 'var(--accent-soft)' : 'var(--surface)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    position: 'relative',
                    fontSize: 17,
                  }}
                >
                  🔔
                  {notifications.length > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: 'var(--red)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 5px',
                    }}>
                      {notifications.length > 99 ? '99+' : notifications.length}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 46,
                    right: 0,
                    width: 360,
                    maxWidth: 'calc(100vw - 32px)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    boxShadow: '0 18px 45px rgba(15, 23, 42, 0.16)',
                    overflow: 'hidden',
                    zIndex: 80,
                  }}>
                    <div style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>Notifications</div>
                      <button
                        type="button"
                        onClick={clearNotifications}
                        disabled={notifications.length === 0}
                        style={{
                          border: '1px solid var(--border)',
                          background: 'var(--surface-alt)',
                          color: notifications.length === 0 ? 'var(--text-dim)' : 'var(--text-muted)',
                          borderRadius: 8,
                          padding: '6px 10px',
                          cursor: notifications.length === 0 ? 'not-allowed' : 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 20, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>
                          No previous notifications.
                        </div>
                      ) : notifications.map(item => (
                        <div key={item.id} style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                            {item.title || 'Reminder'}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                            {item.message}
                          </div>
                          {item.text && (
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.45, marginTop: 6 }}>
                              {item.type}: {item.text}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                            {new Date(item.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
            </div>
          ) : (
            <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" size="sm" onClick={() => openLogin('login')}>Log in</Button>
              <Button size="sm" onClick={() => openLogin('signup')}>Sign up</Button>
            </div>
          )}
        </header>

        <main className="app-main" style={{ flex: 1, padding: '32px 40px', overflowX: 'hidden' }}>
          <Page />
        </main>
      </div>

      {/* Login / signup modal */}
      {loginOpen && <Login />}
      {reminderPopup && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 50,
            width: 340,
            maxWidth: 'calc(100vw - 32px)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.16)',
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Reminder</div>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.45 }}>{reminderPopup.message}</div>
              {reminderPopup.text && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.45 }}>
                  {reminderPopup.type}: {reminderPopup.text}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setReminderPopup(null)}
              aria-label="Close reminder"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
