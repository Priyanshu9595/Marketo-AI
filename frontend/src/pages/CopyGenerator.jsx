import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { Input, Select } from '../components/Input'
import { COPY_TYPES, TONE_OPTIONS } from '../utils/constants'
import { streamText } from '../utils/helpers'
import { useAuthContext } from '../context/AuthContext'

export default function CopyGenerator() {
  const [form, setForm] = useState({ brand: '', product: '', audience: '', tone: 'Playful', type: 'Instagram caption', keywords: '' })
  const [output,  setOutput]  = useState('')
  const [loading, setLoading] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const { requireAuth } = useAuthContext()

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const generate = async () => {
    if (!requireAuth()) return
    if (!form.brand || !form.product) return
    setLoading(true)
    setOutput('')
    try {
      const res = await fetch('/api/ai/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      await streamText(data.content || data.error || 'No content returned.', setOutput)
    } catch {
      // Fallback demo output if backend not running
      const demo = `✨ Introducing ${form.product} by ${form.brand} — crafted for ${form.audience}.\n\nEvery detail tells a story. Every wear, a memory.\n\n💫 Tap the link in bio to explore.\n\n${form.keywords.split(',').map(k => `#${k.trim().replace(/ /g, '')}`).join(' ')} #${form.brand.replace(/ /g, '')} #Fashion #D2C`
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>AI copy generator</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Generate optimised marketing content in seconds</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left: inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              <Button onClick={generate} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                ✦ {loading ? 'Generating…' : 'Generate content'}
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
        <Card style={{ minHeight: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Output</div>
            {output && (
              <Button size="sm" variant="ghost" onClick={copy}>
                {copied ? '✓ Copied!' : '⧉ Copy'}
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
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, color: output ? 'var(--text)' : 'var(--text-dim)', lineHeight: 1.7, fontFamily: 'inherit', margin: 0, minHeight: 200 }}>
            {output || 'Fill in your brand details and click generate →'}
          </pre>
        </Card>
      </div>
    </div>
  )
}