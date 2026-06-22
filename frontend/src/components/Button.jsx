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
      background: 'linear-gradient(135deg, #2458FF, #173BD7 52%, #00A878)',
      color: '#fff',
      boxShadow: disabled ? 'none' : hover ? '0 14px 28px rgba(36,88,255,0.38)' : '0 8px 18px rgba(36,88,255,0.25)',
    },
    ghost: {
      background: hover ? 'var(--accent-soft)' : 'transparent',
      color: hover ? 'var(--accent)' : 'var(--text-muted)',
      border: `1px solid ${hover ? 'var(--accent)' : 'var(--border)'}`,
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
    gradient: {
      background: 'linear-gradient(135deg, #2458FF 0%, #173BD7 45%, #00A878 100%)',
      color: '#fff',
      boxShadow: disabled
        ? 'none'
        : hover ? '0 14px 30px rgba(36,88,255,0.42)' : '0 8px 18px rgba(36,88,255,0.28)',
      transform: hover && !disabled ? 'translateY(-1px)' : 'translateY(0)',
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
