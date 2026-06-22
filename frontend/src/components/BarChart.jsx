import { useState } from 'react'
import { formatINR } from '../utils/helpers'

export default function BarChart({ data, height = 120, color = 'var(--accent)' }) {
  const [selected, setSelected] = useState(null)
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
      {data.map((d, i) => {
        const active = selected === i
        return (
          <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4, position: 'relative' }}>
            {active && (
              <div style={{
                position: 'absolute',
                bottom: 24 + (d.value / max) * (height - 24),
                background: 'var(--text)',
                color: 'var(--surface)',
                borderRadius: 6,
                padding: '4px 7px',
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                zIndex: 2,
              }}>
                {formatINR(d.value)}
              </div>
            )}
            <button
              type="button"
              title={`${d.label}: ${formatINR(d.value)}`}
              onClick={() => setSelected(active ? null : i)}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: '4px 4px 0 0',
                background: color,
                height: `${(d.value / max) * 100}%`,
                minHeight: 4,
                opacity: active ? 1 : 0.85,
                transition: 'height 0.4s ease, opacity 0.15s',
                cursor: 'pointer',
                padding: 0,
              }}
            />
            <span style={{ fontSize: 10, color: active ? 'var(--accent-mid)' : 'var(--text-dim)', fontWeight: active ? 700 : 400 }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}
