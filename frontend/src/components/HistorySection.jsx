import Card from './Card'
import Tilt3D from './Tilt3D'

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Grid of past generations for a tool (image/video thumbnails or text snippets).
export default function HistorySection({ items, onClear, accent = '#4F46E5', onSelect }) {
  if (!items?.length) return null
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          History · {items.length}
        </div>
        <button
          onClick={onClear}
          style={{
            fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 10px', borderRadius: 6,
            border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)',
          }}
        >
          Clear
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {items.map(it => (
          <Tilt3D key={it.id} max={14} glow={accent} radius={10}>
          <div
            onClick={() => onSelect?.(it)}
            style={{
              border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
              background: 'var(--surface-alt)', cursor: onSelect ? 'pointer' : 'default', height: '100%',
            }}
          >
            {it.kind === 'image' && (
              <img src={it.url} alt={it.title} style={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }} />
            )}
            {it.kind === 'video' && (
              <video src={it.url} muted style={{ width: '100%', height: 96, objectFit: 'cover', display: 'block', background: '#000' }} />
            )}
            {it.kind === 'text' && (
              <div style={{ padding: 10, height: 96, overflow: 'hidden', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {it.preview}
              </div>
            )}
            <div style={{ padding: '8px 10px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {it.title || 'Untitled'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{timeAgo(it.at)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: accent }}>₹{Number(it.cost || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          </Tilt3D>
        ))}
      </div>
    </Card>
  )
}
