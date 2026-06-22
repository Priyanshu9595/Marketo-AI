import { useState } from 'react'
import HistorySection from '../components/HistorySection'
import { Input } from '../components/Input'
import { AI_COSTS } from '../utils/helpers'
import { useGenerationHistory } from '../hooks/useGenerationHistory'
import { useAuthContext } from '../context/AuthContext'

const ACCENT = '#6C63FF'
const PURPLE_GRADIENT = 'linear-gradient(135deg, #7C3AED, #4F46E5)'

const STYLES = ['Photorealistic', 'Illustration', 'Studio', 'Flat design', 'Cinematic']
const ASPECTS = [
  { ratio: '1:1', w: 22, h: 22 },
  { ratio: '4:5', w: 18, h: 22 },
  { ratio: '16:9', w: 26, h: 15 },
  { ratio: '9:16', w: 13, h: 22 },
]
const COUNTS = [1, 2, 4]
const ratioToCss = (r) => r.replace(':', ' / ')

// Self-contained gradient placeholder (shown if a real image fails to load)
const placeholderImage = (w, h, label = '') => {
  const safe = String(label).slice(0, 40).replace(/[<&>]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6C63FF"/><stop offset="1" stop-color="#22D3A0"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="52%" fill="white" font-family="sans-serif" font-size="${Math.round(Math.min(w, h) / 12)}" font-weight="bold" text-anchor="middle">🖼</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const Label = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
    {children}
  </div>
)

export default function ImageGen() {
  const [prompt, setPrompt]   = useState('')
  const [product, setProduct] = useState('')
  const [style, setStyle]     = useState('Photorealistic')
  const [aspect, setAspect]   = useState('1:1')
  const [count, setCount]     = useState(1)
  const [images, setImages]   = useState([])    // [{ url, prompt }]
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const { requireAuth } = useAuthContext()
  const { history, add, clear } = useGenerationHistory('image')

  const totalCost = AI_COSTS.image * count

  const generateOne = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/ai/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ prompt, product, size: aspect, style: style === 'Photorealistic' ? '' : style, images: [] }),
    })
    const data = await res.json().catch(() => null)
    if (!data) throw new Error('Backend not reachable — is it running? (cd backend && npm run dev)')
    if (!res.ok) throw new Error(data.error || 'Image generation failed')
    return data.url
  }

  const generate = async () => {
    if (!requireAuth()) return
    if (!prompt.trim()) { setError('Please enter a prompt describing the image you want.'); return }
    setError('')
    setLoading(true)
    setImages([])
    try {
      const urls = await Promise.all(Array.from({ length: count }, () => generateOne()))
      const items = urls.map(url => ({ url, prompt }))
      setImages(items)
      items.forEach(it => add({ kind: 'image', url: it.url, title: product || prompt, cost: AI_COSTS.image }))
    } catch (err) {
      setError(err.message?.startsWith('Gemini image generation failed')
        ? 'Gemini could not create this image. Try a more generic prompt without real people, teams, logos, or copyrighted names.'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  const regenerate = async (i) => {
    if (!requireAuth()) return
    setError('')
    try {
      const url = await generateOne()
      setImages(prev => prev.map((it, idx) => idx === i ? { ...it, url } : it))
      add({ kind: 'image', url, title: product || prompt, cost: AI_COSTS.image })
    } catch (err) {
      setError(err.message)
    }
  }

  const download = async (url) => {
    const name = (product || prompt || 'marketo-image').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image'
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('svg') ? 'svg' : 'jpg'
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl; a.download = `${name}.${ext}`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(objUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const cardBtn = (active) => ({
    fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '7px 0', borderRadius: 8,
    flex: 1, textAlign: 'center',
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? PURPLE_GRADIENT : 'var(--surface-alt)',
    color: active ? '#fff' : 'var(--text-muted)',
  })

  return (
    <div className="ai-showcase image-showcase">
      <section className="showcase-copy">
        <div className="showcase-pill">AI product images</div>
        <h1>AI product images that <span>sell more.</span></h1>
        <p>Create studio-quality visuals in seconds. Perfect for ecommerce, ads, and every place your brand shines.</p>
        <div className="showcase-benefits">
          <div><strong>Photorealistic results</strong><span>Clean, conversion-ready visuals</span></div>
          <div><strong>Generate in seconds</strong><span>Go from idea to image instantly</span></div>
          <div><strong>Built for ecommerce</strong><span>Ratios for ads, reels, posts and stores</span></div>
        </div>
        <button className="showcase-cta" onClick={generate} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Images'}
        </button>
      </section>

      <div className="showcase-board creative-page image-studio" style={{ border: '1px solid var(--border)', borderRadius: 18, padding: 18, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Dark header */}
      <div className="creative-hero-card image-hero-card" style={{ background: '#171a2b', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: PURPLE_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🖼</div>
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 800 }}>AI Images</h2>
          <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Generate high-quality product visuals in seconds</p>
        </div>
      </div>

      <div className="creative-chip-row">
        <span>Studio visuals</span>
        <span>Custom ratios</span>
        <span>Instant download</span>
      </div>

      <div className="creative-grid image-gen-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: controls */}
        <div className="creative-control-panel" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <Label>Prompt</Label>
            <Input value={prompt} onChange={setPrompt} rows={3} placeholder="e.g. A silk kurta on a minimal white studio background, product shot, editorial lighting" />
          </div>
          <div>
            <Label>Brand / Product</Label>
            <Input value={product} onChange={setProduct} placeholder="e.g. Niharika — Silk Kurta" />
          </div>

          <div>
            <Label>Visual style</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STYLES.map(s => {
                const active = style === s
                return (
                  <button key={s} onClick={() => setStyle(s)}
                    style={{
                      padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: active ? 'none' : '1px solid var(--border)',
                      background: active ? PURPLE_GRADIENT : 'var(--surface-alt)',
                      color: active ? '#fff' : 'var(--text-muted)',
                    }}>
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label>Aspect ratio</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ASPECTS.map(a => {
                const active = aspect === a.ratio
                return (
                  <button key={a.ratio} onClick={() => setAspect(a.ratio)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      border: active ? 'none' : '1px solid var(--border)',
                      background: active ? PURPLE_GRADIENT : 'var(--surface-alt)',
                      color: active ? '#fff' : 'var(--text-muted)',
                    }}>
                    <span style={{ width: a.w, height: a.h, borderRadius: 3, border: `2px solid ${active ? '#fff' : 'var(--text-dim)'}` }} />
                    <span style={{ fontSize: 10, fontWeight: 700 }}>{a.ratio}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label>Number of images</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COUNTS.map(n => (
                <button key={n} onClick={() => setCount(n)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    border: count === n ? 'none' : '1px solid var(--border)',
                    background: count === n ? '#171a2b' : 'var(--surface-alt)',
                    color: count === n ? '#fff' : 'var(--text-muted)',
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Cost estimate */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: `${ACCENT}12`, border: `1px solid ${ACCENT}33` }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>⚡ Estimated cost</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: ACCENT }}>
              ₹{totalCost.toFixed(2)} <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>/ generation</span>
            </span>
          </div>

          {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}

          <button onClick={generate} disabled={loading}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 700, color: '#fff', opacity: loading ? 0.7 : 1,
              background: PURPLE_GRADIENT, boxShadow: '0 8px 20px rgba(79,70,229,0.30)',
            }}>
            ✨ {loading ? 'Generating…' : 'Generate Images'}
          </button>
        </div>

        {/* Right: generated images */}
        <div className="creative-output-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Generated Images</div>
            <button onClick={() => setShowHistory(s => !s)}
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              🕘 {showHistory ? 'Hide history' : 'View history'}
            </button>
          </div>

          {(loading || images.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(count, 3)}, 1fr)`, gap: 14 }}>
              {(loading ? Array.from({ length: count }) : images).map((it, i) => (
                <div className="creative-result-card" key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface-alt)' }}>
                  {loading || !it ? (
                    <div style={{ aspectRatio: ratioToCss(aspect), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--accent-soft)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : (
                    <>
                      <img src={it.url} alt={it.prompt}
                        onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = '1'; e.currentTarget.src = placeholderImage(600, 600, it.prompt) } }}
                        style={{ width: '100%', aspectRatio: ratioToCss(aspect), objectFit: 'cover', display: 'block', background: '#000' }} />
                      <div style={{ display: 'flex', gap: 8, padding: 8 }}>
                        <button onClick={() => download(it.url)} style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '7px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          ⬇ Download
                        </button>
                        <button onClick={() => regenerate(i)} style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '7px 0', borderRadius: 8, border: 'none', background: '#171a2b', color: '#fff', cursor: 'pointer' }}>
                          ⟳ Regenerate
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty / drop hint */}
          <div className="creative-empty-state" style={{
            border: '1.5px dashed var(--border)', borderRadius: 14,
            minHeight: images.length || loading ? 120 : 320,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🖼️</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>New images will appear here</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Fill in the prompt and click Generate</div>
          </div>
        </div>
      </div>

        {showHistory && <HistorySection items={history} onClear={clear} accent={ACCENT} onSelect={(it) => setImages([{ url: it.url, prompt: it.title }])} />}
      </div>
    </div>
  )
}
