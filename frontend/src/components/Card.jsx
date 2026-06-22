export default function Card({ children, style = {}, onClick, className = '' }) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-hover)'
        e.currentTarget.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.06)'
        if (onClick) e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)'
        if (onClick) e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {children}
    </div>
  )
}
