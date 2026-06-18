import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { Input, Select } from '../components/Input'
import { useAuthContext } from '../context/AuthContext'

const STYLES = ['Any', 'Lifestyle', 'Studio', 'Editorial', 'Promotional', 'Festival']

// A self-contained gradient placeholder image (no network needed)
const placeholderImage = (w, h, label = '') => {
  const safe = String(label).slice(0, 40).replace(/[<&>]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6C63FF"/><stop offset="1" stop-color="#22D3A0"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="48%" fill="white" font-family="sans-serif" font-size="${Math.round(Math.min(w, h) / 12)}" font-weight="bold" text-anchor="middle">🖼</text>
    <text x="50%" y="58%" fill="rgba(255,255,255,0.9)" font-family="sans-serif" font-size="${Math.round(Math.min(w, h) / 22)}" text-anchor="middle">${safe}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const SIZES = [
  { ratio: '1:1',    label: 'Square',       w: 1080, h: 1080, note: 'Instagram post, profile' },
  { ratio: '4:5',    label: 'Portrait',     w: 1080, h: 1350, note: 'Instagram portrait' },
  { ratio: '9:16',   label: 'Story / Reel', w: 1080, h: 1920, note: 'Stories, Reels, Shorts' },
  { ratio: '16:9',   label: 'Landscape',    w: 1920, h: 1080, note: 'YouTube, web banner' },
  { ratio: '1.91:1', label: 'Wide ad',      w: 1200, h: 628,  note: 'Facebook / X link ad' },
  { ratio: '2:3',    label: 'Pinterest',    w: 1000, h: 1500, note: 'Pinterest pin' },
  { ratio: '3:2',    label: 'Classic',      w: 1500, h: 1000, note: 'Standard photo' },
]

export default function ImageGen() {
  const [prompt,    setPrompt]    = useState('')
  const [product,   setProduct]   = useState('')
  const [size,      setSize]      = useState('1:1') // image size / aspect ratio
  const [style,     setStyle]     = useState('Any') // optional
  const [loading,   setLoading]   = useState(false)
  const [generated, setGenerated] = useState(null)
  const [error,     setError]     = useState('')
  const { requireAuth } = useAuthContext()

  const generate = async () => {
    if (!requireAuth()) return
    if (!prompt.trim()) {
      setError('Please enter a prompt describing the image you want.')
      return
    }
    setError('')
    setLoading(true)
    setGenerated(null)
    const sz = SIZES.find(s => s.ratio === size) || SIZES[0]
    const payload = { prompt, product, size, width: sz.w, height: sz.h, style: style === 'Any' ? '' : style }
    try {
      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setGenerated({ url: data.url, prompt, product, size, style })
    } catch {
      // No image API connected → show a built-in placeholder at the chosen size
      setGenerated({ url: placeholderImage(sz.w, sz.h, prompt), prompt, product, size, style })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>AI product images</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Generate studio-quality lifestyle and promotional images</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Prompt (required)"
                value={prompt}
                onChange={setPrompt}
                rows={3}
                placeholder="Describe the image, e.g. 'White running shoes on a beach at sunset, golden light, splashing water, cinematic'"
              />
              <Input label="Product description (optional)" value={product} onChange={setProduct} placeholder="e.g. White running shoes" />
              <Select label="Style (optional)" value={style} onChange={setStyle} options={STYLES} />
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Size</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SIZES.map((s) => {
                    const active = size === s.ratio
                    return (
                      <div key={s.ratio} onClick={() => setSize(s.ratio)}
                        style={{
                          padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 12,
                          border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                          background: active ? 'var(--accent-soft)' : 'var(--surface-alt)',
                          transition: 'all 0.15s',
                        }}>
                        {/* Aspect-ratio thumbnail */}
                        <div style={{
                          width: 30, height: 30, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{
                            width: s.w >= s.h ? 26 : 26 * (s.w / s.h),
                            height: s.h >= s.w ? 26 : 26 * (s.h / s.w),
                            borderRadius: 3,
                            border: `2px solid ${active ? 'var(--accent)' : 'var(--text-dim)'}`,
                          }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--accent-mid)' : 'var(--text)' }}>
                            {s.label} · {s.ratio}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{s.w}×{s.h} · {s.note}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}
              <Button onClick={generate} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                🖼 {loading ? 'Generating…' : 'Generate image'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
            {loading ? (
              <div style={{ height: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--accent-soft)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Generating your image…</div>
              </div>
            ) : generated ? (
              <>
                <img
                  src={generated.url}
                  alt="Generated product"
                  onError={(e) => {
                    if (!e.currentTarget.dataset.fallback) {
                      e.currentTarget.dataset.fallback = '1'
                      e.currentTarget.src = placeholderImage(800, 600, generated.prompt)
                    }
                  }}
                  style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }}
                />
                <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{generated.product || generated.prompt}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {[generated.size, generated.style !== 'Any' ? generated.style : null].filter(Boolean).join(' · ') || 'Custom prompt'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button size="sm" variant="ghost" onClick={generate}>Regenerate</Button>
                    <Button size="sm">Download</Button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ height: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🖼</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No image yet</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Enter a prompt and click generate</div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}