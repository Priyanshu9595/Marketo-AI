export default function PageHero({ icon, title, subtitle, accent = '#6C63FF' }) {
  const heroAccent = accent === '#6C63FF' ? '#2458FF' : accent
  const displayIcon = icon

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        padding: '26px 30px',
        background: `linear-gradient(135deg, ${heroAccent}24, rgba(0,168,120,0.16) 58%, rgba(255,61,127,0.10))`,
        border: '1px solid var(--border)',
        boxShadow: '0 24px 70px -42px rgba(36,88,255,0.75)',
      }}
    >
      <div
        style={{
          position: 'absolute', right: -50, top: -50, width: 180, height: 180,
          borderRadius: '50%', pointerEvents: 'none',
          background: `radial-gradient(circle, ${heroAccent}33, transparent 70%)`,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
        <div
          style={{
            width: 58, height: 58, flexShrink: 0, borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21,
            fontWeight: 900, letterSpacing: '-0.04em',
            background: `linear-gradient(135deg, ${heroAccent}, #173BD7 52%, #00A878)`,
            color: '#fff', boxShadow: `0 12px 26px ${heroAccent}55`,
          }}
        >
          {displayIcon}
        </div>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-0.04em' }}>{title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '5px 0 0', fontWeight: 600 }}>{subtitle}</p>
        </div>
      </div>
    </div>
  )
}
