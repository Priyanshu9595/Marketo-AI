export default function BarChart({ data, height = 120, color = 'var(--accent)' }) {
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
          <div
            title={`${d.label}: ${d.value}`}
            style={{
              width: '100%',
              borderRadius: '4px 4px 0 0',
              background: color,
              height: `${(d.value / max) * 100}%`,
              minHeight: 4,
              opacity: 0.85,
              transition: 'height 0.4s ease',
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}