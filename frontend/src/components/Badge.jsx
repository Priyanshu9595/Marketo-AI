export default function Badge({ children, color = 'var(--accent)' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.04em',
      background: color + '22',
      color,
    }}>
      {children}
    </span>
  )
}