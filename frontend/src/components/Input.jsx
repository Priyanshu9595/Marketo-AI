export function Input({ label, value, onChange, placeholder, type = 'text', rows, step }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-dim)',
          letterSpacing: '0.07em', textTransform: 'uppercase',
        }}>
          {label}
        </label>
      )}
      {rows ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
        />
      ) : (
        <input
          type={type}
          step={step}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

export function Select({ label, value, onChange, options, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-dim)',
          letterSpacing: '0.07em', textTransform: 'uppercase',
        }}>
          {label}
        </label>
      )}
      <select value={value} onChange={e => onChange(e.target.value)}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(o =>
          typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  )
}