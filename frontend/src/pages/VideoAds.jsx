import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { Input, Select } from '../components/Input'
import { AD_FORMATS } from '../utils/constants'
import { useAuthContext } from '../context/AuthContext'

const MUSIC    = ['Upbeat pop', 'Cinematic', 'Lo-fi chill', 'Energetic', 'No music']
const VOICE    = ['Female — warm', 'Male — confident', 'Female — energetic', 'No voiceover']
const STEPS    = ['Analysing product images…', 'Composing scene transitions…', 'Adding AI voiceover…', 'Syncing background music…', 'Inserting brand & CTA…', 'Rendering MP4…']

export default function VideoAds() {
  const [format,   setFormat]   = useState('15s Reel')
  const [prompt,   setPrompt]   = useState('')
  const [music,    setMusic]    = useState('Upbeat pop')
  const [voice,    setVoice]    = useState('Female — warm')
  const [brand,    setBrand]    = useState('')
  const [cta,      setCta]      = useState('Shop now')
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [done,     setDone]     = useState(false)
  const [step,     setStep]     = useState('')
  const [error,    setError]    = useState('')
  const { requireAuth } = useAuthContext()

  const generate = async () => {
    if (!requireAuth()) return
    if (!prompt.trim()) {
      setError('Please enter a prompt describing the video you want.')
      return
    }
    setError('')

    // Payload to send to your paid video-generation API
    const payload = { prompt, format, music, voice, brand, cta }

    setLoading(true); setDone(false); setProgress(0)

    // TODO: replace this simulated loop with the real API call, e.g.
    // const res = await fetch('/api/ai/video', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // })
    // const data = await res.json()  // { videoUrl }
    console.log('Video request payload:', payload)

    for (let i = 0; i < STEPS.length; i++) {
      setStep(STEPS[i])
      await new Promise(r => setTimeout(r, 700))
      setProgress(Math.round(((i + 1) / STEPS.length) * 100))
    }
    setLoading(false); setDone(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>AI video ads</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Turn product images into scroll-stopping video ads</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Upload product images</div>
            <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📤</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop images here</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>PNG, JPG, WEBP · up to 10 images</div>
              <Button size="sm" style={{ marginTop: 12 }}>Choose files</Button>
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 10 }}>Video format</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {AD_FORMATS.map(f => (
                    <div key={f.name} onClick={() => setFormat(f.name)}
                      style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${format === f.name ? 'var(--accent)' : 'var(--border)'}`,
                        background: format === f.name ? 'var(--accent-soft)' : 'var(--surface-alt)',
                        transition: 'all 0.15s',
                      }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{f.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: format === f.name ? 'var(--accent-mid)' : 'var(--text)' }}>{f.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{f.ratio} · {f.platforms}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Input
                label="Prompt / creative brief"
                value={prompt}
                onChange={setPrompt}
                rows={3}
                placeholder="Describe the video you want, e.g. 'Energetic 15s reel showcasing our running shoes on a beach at sunset, fast cuts, upbeat vibe, end with logo and Shop Now'"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Select label="Background music" value={music} onChange={setMusic} options={MUSIC} />
                <Select label="AI voiceover"     value={voice} onChange={setVoice} options={VOICE} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="Brand name" value={brand} onChange={setBrand} placeholder="Your brand" />
                <Input label="CTA text"   value={cta}   onChange={setCta}   placeholder="Shop now" />
              </div>
              {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}
              <Button onClick={generate} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                🎬 {loading ? 'Creating video…' : 'Create video ad'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Preview</div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ height: 180, borderRadius: 12, background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🎬</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{step}</div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rendering</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{progress}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--surface-alt)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                </div>
              </div>
            ) : done ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ height: 180, borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid rgba(108,99,255,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ fontSize: 36 }}>✅</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Video ready!</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{format} · {music}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {['MP4', 'Reel cut', 'Story cut'].map(fmt => (
                    <Button key={fmt} size="sm" variant="ghost" style={{ justifyContent: 'center', fontSize: 11 }}>⬇ {fmt}</Button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ height: 180, borderRadius: 12, background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 32 }}>🎥</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configure and click create</div>
              </div>
            )}
          </Card>

          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>What's included</div>
            {[['🎙️', 'AI voiceover', 'Natural-sounding narration'], ['🎵', 'Background music', 'Royalty-free, mood-matched'], ['📝', 'Auto-captions', 'Accessibility & engagement'], ['🏷️', 'Brand logo', 'Watermark & CTA overlay'], ['📱', 'Multi-format export', 'Reels, Shorts, Stories']].map(([e, t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{e}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{d}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}