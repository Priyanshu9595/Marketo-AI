import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import PageHero from '../components/PageHero'
import Tilt3D from '../components/Tilt3D'
import CostBadge from '../components/CostBadge'
import HistorySection from '../components/HistorySection'
import { Input, Select } from '../components/Input'
import { COPY_TYPES, TONE_OPTIONS } from '../utils/constants'
import { streamText, AI_COSTS } from '../utils/helpers'
import { useGenerationHistory } from '../hooks/useGenerationHistory'
import { useAuthContext } from '../context/AuthContext'
import { apiFetch } from '../utils/api'

const ACCENT = '#2458FF'

export default function CopyGenerator() {
  const [form, setForm] = useState({ brand: '', product: '', audience: '', tone: 'Playful', customTone: '', type: 'Instagram caption', customType: '', words: '', keywords: '' })
  const [output,  setOutput]  = useState('')
  const [loading, setLoading] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const { requireAuth } = useAuthContext()
  const { history, add, clear } = useGenerationHistory('copy')

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const generate = async () => {
    if (!requireAuth()) return
    if (!form.brand || !form.product) return
    setLoading(true)
    setOutput('')
    try {
      const data = await apiFetch('/ai/copy', {
        method: 'POST',
        body: {
          ...form,
          type: form.type === 'Write by yourself' ? (form.customType || 'custom marketing copy') : form.type,
          tone: form.tone === 'Write by yourself' ? (form.customTone || 'custom brand tone') : form.tone,
        },
      })
      const finalText = data.content || data.error || 'No content returned.'
      await streamText(finalText, setOutput)
      if (data.content) {
        add({ kind: 'text', title: `${form.brand} - ${form.product}`, preview: finalText, cost: AI_COSTS.copy })
      }
    } catch {
      // Fallback demo output if backend not running
      const demo = `Introducing ${form.product} by ${form.brand} - crafted for ${form.audience}.\n\nEvery detail tells a story. Every wear, a memory.\n\nTap the link in bio to explore.\n\n${form.keywords.split(',').map(k => `#${k.trim().replace(/ /g, '')}`).join(' ')} #${form.brand.replace(/ /g, '')} #Fashion #D2C`
      await streamText(demo, setOutput)
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="copy-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHero icon="AI" title="AI copy generator" subtitle="Generate bold marketing content with sharper brand voice" accent={ACCENT} />

      <div className="copy-studio-strip">
        <div className="copy-studio-chip">
          <strong>Fast idea to final copy</strong>
          <span>Captions, ads, product blurbs and custom formats.</span>
        </div>
        <div className="copy-studio-chip">
          <strong>Control the voice</strong>
          <span>Pick a tone or write your own brand style.</span>
        </div>
        <div className="copy-studio-chip">
          <strong>Flexible length</strong>
          <span>Leave words empty or guide the output size.</span>
        </div>
      </div>

      <div className="copy-generator-grid">
        {/* Left: inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="copy-card-heading">
                <strong>Creative brief</strong>
                <span>Required inputs</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="Brand name"  value={form.brand}    onChange={set('brand')}    placeholder="e.g. Niharika" />
                <Input label="Product"     value={form.product}  onChange={set('product')}  placeholder="e.g. Silk kurta" />
              </div>
              <Input label="Target audience" value={form.audience} onChange={set('audience')} placeholder="Women 25–40, urban professionals" />
              <Input label="Keywords (comma-separated)" value={form.keywords} onChange={set('keywords')} placeholder="ethnic, festive, premium, handloom" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Select label="Content type" value={form.type} onChange={set('type')} options={COPY_TYPES} />
                <Select label="Brand tone"   value={form.tone} onChange={set('tone')} options={TONE_OPTIONS} />
              </div>
              {form.type === 'Write by yourself' && (
                <Input label="Write by yourself" value={form.customType} onChange={set('customType')} placeholder="e.g. WhatsApp promo message, LinkedIn post, landing page hero copy" />
              )}
              {form.tone === 'Write by yourself' && (
                <Input label="Brand tone by yourself" value={form.customTone} onChange={set('customTone')} placeholder="e.g. friendly Hinglish, premium but simple, bold Gen Z" />
              )}
              <Input label="Words (optional)" value={form.words} onChange={set('words')} placeholder="e.g. 50, 100, 250" />
              <CostBadge cost={AI_COSTS.copy} unit="generation" accent={ACCENT} />
              <Button onClick={generate} disabled={loading} variant="gradient" style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Generating...' : 'Generate content'}
              </Button>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Quick templates</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Diwali sale', 'New launch', 'Brand story', 'Flash sale', 'Collab'].map(t => (
                <button key={t}
                  onClick={() => setForm(f => ({ ...f, product: t, brand: f.brand || 'My Brand' }))}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                  {t}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: output */}
        <Tilt3D glow={ACCENT}>
        <Card style={{
          minHeight: 430,
          height: '100%',
          background: 'linear-gradient(155deg, #101828 0%, #173BD7 58%, #00A878 130%)',
          border: '1px solid rgba(255,255,255,0.20)',
          boxShadow: '0 28px 70px -34px rgba(23,59,215,0.95)',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.62)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Output</div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 2 }}>Ready copy</div>
            </div>
            {output && (
              <Button size="sm" variant="ghost" onClick={copy} style={{ background: 'rgba(255,255,255,0.95)', color: '#173BD7', border: '1px solid rgba(255,255,255,0.35)' }}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            )}
          </div>
          {loading && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          )}
          <pre className="copy-output-pre" style={{ color: output ? '#fff' : 'rgba(255,255,255,0.62)' }}>
            {output || 'Fill in your brand details and click generate.'}
          </pre>
        </Card>
        </Tilt3D>
      </div>

      <HistorySection items={history} onClear={clear} accent={ACCENT} />
    </div>
  )
}
