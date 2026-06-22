// Shows the estimated paid-API cost before the user generates.
export default function CostBadge({ cost, unit = 'generation', accent = '#4F46E5' }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '10px 14px', borderRadius: 10,
        background: `${accent}12`, border: `1px solid ${accent}33`,
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        💳 Estimated cost
      </span>
      <span style={{ fontSize: 14, fontWeight: 800, color: accent }}>
        ₹{Number(cost).toFixed(2)}
        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}> / {unit}</span>
      </span>
    </div>
  )
}
