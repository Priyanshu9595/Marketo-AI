import { useState } from 'react'

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style = {},
  type = 'button',
}) {
  const [hover, setHover] = useState(false)

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    fontWeight: 600,
    transition: 'all 0.15s',
    fontSize: size === 'sm' ? 13 : 14,
    padding: size === 'sm' ? '7px 14px' : '10px 20px',
    opacity: disabled ? 0.5 : 1,
  }

  const variants = {
    primary: {
      background: hover ? 'var(--accent-mid)' : 'var(--accent)',
      color: '#fff',
    },
    ghost: {
      background: hover ? 'var(--surface-alt)' : 'transparent',
      color: 'var(--text-muted)',
      border: `1px solid ${hover ? 'var(--border-hover)' : 'var(--border)'}`,
    },
    danger: {
      background: hover ? 'rgba(244,63,94,0.2)' : 'var(--red-soft)',
      color: 'var(--red)',
      border: '1px solid rgba(244,63,94,0.3)',
    },
    success: {
      background: hover ? 'rgba(34,211,160,0.2)' : 'var(--green-soft)',
      color: 'var(--green)',
      border: '1px solid rgba(34,211,160,0.3)',
    },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  )
}