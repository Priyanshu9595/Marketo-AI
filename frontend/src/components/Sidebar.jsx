import { useState, useEffect } from 'react'
import { NAV_ITEMS } from '../utils/constants'

const icons = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  calendar:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="9" x2="21" y2="9"/></svg>,
  pen:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  image:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  video:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  rupee:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="6" y1="4" x2="18" y2="4"/><line x1="6" y1="9" x2="18" y2="9"/><path d="M6 20l8-11"/><path d="M6 9c6 0 9 1.5 9 5.5"/></svg>,
  settings:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
}

export default function Sidebar({ active, onNavigate, open = false, onClose }) {
  const [hovered, setHovered] = useState(null)
  const [theme, setTheme] = useState('light')

  // Apply theme to the document root and persist it
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <aside className={`app-sidebar ${open ? 'is-open' : ''}`} style={{
      width: 248,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '18px 14px 6px',
      position: 'sticky',
      top: 0,
      overflowY: 'auto',
    }}>
      {/* Logo + theme toggle */}
      <div className="sidebar-logo" style={{ padding: '10px 14px 26px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src="/favicon.svg"
          alt="Marketo AI"
          className="sidebar-brand-icon"
        />
        <div style={{ flex: 1 }}>
          <div className="sidebar-brand-name">Marketo AI</div>
          <div className="sidebar-brand-sub">D2C growth suite</div>
        </div>
        <button
          className="sidebar-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

        <button
          className="sidebar-close-button"
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          title="Close menu"
        >
          x
        </button>
      {/* Nav links */}
      <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {NAV_ITEMS.filter(i => i.id !== 'settings').map(item => renderNavButton(item))}
      </nav>

      {/* Settings pinned to the bottom */}
      <div className="sidebar-settings" style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        {NAV_ITEMS.filter(i => i.id === 'settings').map(item => renderNavButton(item))}
      </div>
    </aside>
  )

  function renderNavButton(item) {
    const isActive = active === item.id
    const isHovered = hovered === item.id
    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        onMouseEnter={() => setHovered(item.id)}
        onMouseLeave={() => setHovered(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 12px', borderRadius: 14, border: '1px solid',
          background: isActive
            ? 'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(168,85,247,0.22), rgba(6,182,212,0.14))'
            : isHovered
              ? 'rgba(255,255,255,0.62)'
              : 'transparent',
          color: isActive ? '#1d4ed8' : 'var(--text-muted)',
          cursor: 'pointer',
          fontWeight: isActive ? 800 : 600,
          fontSize: 14, textAlign: 'left', width: '100%',
          transition: 'all 0.2s ease',
          borderColor: isActive ? 'rgba(37,99,235,0.26)' : 'transparent',
          boxShadow: isActive ? '0 12px 28px rgba(37,99,235,0.16)' : isHovered ? '0 8px 20px rgba(37,99,235,0.08)' : 'none',
          transform: isHovered || isActive ? 'translateX(3px)' : 'translateX(0)',
        }}
      >
        <span
          style={{
            color: isActive ? '#fff' : 'currentColor',
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: 10,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isActive ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'rgba(37,99,235,0.08)',
          }}
        >
          {icons[item.icon]}
        </span>
        {item.label}
      </button>
    )
  }
}
