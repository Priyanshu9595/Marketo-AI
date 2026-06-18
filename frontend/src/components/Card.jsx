export default function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
        ...style,
      }}
      onMouseEnter={e => {
        if (onClick) e.currentTarget.style.borderColor = 'var(--border-hover)'
      }}
      onMouseLeave={e => {
        if (onClick) e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      {children}
    </div>
  )
}