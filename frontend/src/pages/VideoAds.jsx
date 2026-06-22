import { useState, useRef } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import PageHero from '../components/PageHero'
import Tilt3D from '../components/Tilt3D'
import CostBadge from '../components/CostBadge'
import HistorySection from '../components/HistorySection'
import { Input, Select } from '../components/Input'
import { AD_FORMATS } from '../utils/constants'
import { AI_COSTS } from '../utils/helpers'
import { useGenerationHistory } from '../hooks/useGenerationHistory'
import { useAuthContext } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'

const ACCENT = '#F97316'

const MUSIC    = ['Upbeat pop', 'Cinematic', 'Lo-fi chill', 'Energetic', 'Write music name', 'No music']
const VOICE    = ['Female — warm', 'Male — confident', 'Female — energetic', 'No voiceover']
const VIDEO_QUALITY = ['720p', '1080p', 'Write by yourself']
const STEPS    = ['Analysing product images…', 'Composing scene transitions…', 'Adding AI voiceover…', 'Syncing background music…', 'Polishing final frames…', 'Rendering MP4…']

export default function VideoAds() {
  const [format,   setFormat]   = useState('15s Reel')
  const [prompt,   setPrompt]   = useState('')
  const [music,    setMusic]    = useState('')
  const [voice,    setVoice]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [done,     setDone]     = useState(false)
  const [step,     setStep]     = useState('')
  const [error,    setError]    = useState('')
  const [images,   setImages]   = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [musicName, setMusicName] = useState('')
  const [quality, setQuality] = useState('720p')
  const [customQuality, setCustomQuality] = useState('')
  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const { requireAuth } = useAuthContext()
  const api = useApi()
  const { history, add, clear } = useGenerationHistory('video')

  const readImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({
      name: file.name,
      url: URL.createObjectURL(file),
      dataUrl: reader.result,
      mimeType: file.type,
    })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const addFiles = async (fileList) => {
    const incoming = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    const prepared = await Promise.all(incoming.map(readImage))
    setImages(prev => {
      const combined = [...prev]
      prepared.forEach(img => {
        if (combined.length < 10) combined.push(img)
      })
      return combined
    })
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i))

  const generate = async () => {
    if (!requireAuth()) return
    if (!prompt.trim()) {
      setError('Please enter a prompt describing the video you want.')
      return
    }
    if (music === 'Write music name' && !musicName.trim()) {
      setError('Please write the music name.')
      return
    }
    setError('')

    const payload = {
      prompt,
      format,
      music: music === 'Write music name' ? musicName.trim() : music,
      quality: quality === 'Write by yourself' ? customQuality.trim() : quality,
      voice,
      images: images.slice(0, 3).map(img => ({
        mimeType: img.mimeType,
        data: img.dataUrl?.split(',')[1],
      })),
    }

    setLoading(true); setDone(false); setProgress(0); setVideoUrl(''); setIsPlaying(false)

    let stepIndex = 0
    setStep(STEPS[stepIndex])
    const timer = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, STEPS.length - 1)
      setStep(STEPS[stepIndex])
      setProgress(prev => Math.min(prev + 12, 90))
    }, 4000)

    try {
      const data = await api.post('/ai/video', payload)
      setVideoUrl(data.videoUrl)
      setProgress(100)
      setLoading(false)
      setDone(true)
      add({ kind: 'video', url: data.videoUrl, title: prompt.slice(0, 60) || format, cost: AI_COSTS.video })
    } catch (err) {
      const message = err.message || 'Video generation failed.'
      setError(/real people|likeness|celebrity|filtered|no video URI|raiMedia/i.test(message)
        ? 'Gemini could not create a video with a real person name or likeness. I retried with a fictional/generic version; please remove real names or upload a product-only image.'
        : message)
      setLoading(false)
    } finally {
      window.clearInterval(timer)
    }
  }

  const togglePlayback = async () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      await video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const downloadVideo = async () => {
    if (!videoUrl) return

    try {
      const res = await fetch(videoUrl)
      const blob = await res.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = `marketo-video-ad-${format.toLowerCase().replace(/\s+/g, '-')}.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objUrl)
    } catch {
      window.open(videoUrl, '_blank')
    }
  }

  return (
    <div className="ai-showcase video-showcase">
      <section className="showcase-copy">
        <div className="showcase-pill">AI video ads</div>
        <h1>Turn products into <span>scroll-stopping</span> video ads</h1>
        <p>Upload product images, add a creative brief, and let AI create high-converting video ads in minutes.</p>
        <div className="showcase-benefits">
          <div><strong>AI-powered creativity</strong><span>Video ideas tailored to your product</span></div>
          <div><strong>Optimized for platforms</strong><span>Reels, Stories, Shorts and ads</span></div>
          <div><strong>Fast. Smart. Effective.</strong><span>Create and download from one place</span></div>
        </div>
        <button className="showcase-cta" onClick={generate} disabled={loading}>
          {loading ? 'Creating...' : 'Generate Video Ad'}
        </button>
      </section>

      <div className="showcase-board creative-page video-studio" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="creative-hero-shell">
        <PageHero icon="🎬" title="AI video ads" subtitle="Turn product images into scroll-stopping video ads" accent="#F97316" />
      </div>

      <div className="creative-chip-row">
        <span>10 image storyboard</span>
        <span>Music + voice options</span>
        <span>Play and download</span>
      </div>

      <div className="creative-grid video-ads-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left */}
        <div className="creative-control-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card className="creative-card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              Upload product images {images.length > 0 && `(${images.length}/10)`}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
            />

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                background: dragOver ? 'var(--accent-soft)' : 'transparent',
                borderRadius: 12, padding: 28, textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📤</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop images here</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>PNG, JPG, WEBP · up to 10 images</div>
              <Button size="sm" style={{ marginTop: 12 }} onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}>
                Choose files
              </Button>
            </div>

            {images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 12 }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button
                      onClick={() => removeImage(i)}
                      title="Remove"
                      style={{
                        position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
                        border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer',
                        fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="creative-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Prompt / creative brief (required)"
                value={prompt}
                onChange={setPrompt}
                rows={3}
                placeholder="Describe the video you want, e.g. 'Energetic 15s reel showcasing our running shoes on a beach at sunset, fast cuts, upbeat vibe, end with logo and Shop Now'"
              />
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Select label="Background music" value={music} onChange={setMusic} options={MUSIC} placeholder="Select music" />
                <Select label="AI voiceover"     value={voice} onChange={setVoice} options={VOICE} placeholder="Select voiceover" />
              </div>
              <Select label="Video quality" value={quality} onChange={setQuality} options={VIDEO_QUALITY} />
              {quality === 'Write by yourself' && (
                <Input
                  label="Write video quality"
                  value={customQuality}
                  onChange={setCustomQuality}
                  placeholder="Example: 720p, 1080p, cinematic high quality"
                />
              )}
              {music === 'Write music name' && (
                <Input
                  label="Music name"
                  value={musicName}
                  onChange={setMusicName}
                  placeholder="Example: Bollywood energetic beat, Arijit-style soft romantic, EDM drop"
                />
              )}
              {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}
              <CostBadge cost={AI_COSTS.video} unit="video" accent={ACCENT} />
              <Button onClick={generate} disabled={loading} variant="gradient" style={{ width: '100%', justifyContent: 'center' }}>
                🎬 {loading ? 'Creating video…' : 'Create video ad'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right */}
        <div className="creative-output-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Tilt3D glow={ACCENT}>
          <Card className="creative-card creative-preview-card" style={{ flex: 1 }}>
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
                <div style={{ borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: 12, background: '#f8f9fc' }}>
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      style={{ width: '100%', height: 260, objectFit: 'contain', display: 'block', background: '#000', borderRadius: 10 }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                    />
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Video ready!</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format} | {music === 'Write music name' ? musicName : music || 'No music'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="ghost" onClick={togglePlayback}>
                        {isPlaying ? 'Pause' : 'Play'}
                      </Button>
                      <Button size="sm" onClick={downloadVideo}>
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="creative-empty-state" style={{ height: 180, borderRadius: 12, background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 32 }}>🎥</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configure and click create</div>
              </div>
            )}
          </Card>
          </Tilt3D>

          <Card className="creative-card included-card">
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

        <HistorySection
          items={history}
          onClear={clear}
          accent={ACCENT}
          onSelect={(it) => { setVideoUrl(it.url); setDone(true); setLoading(false) }}
        />
      </div>
    </div>
  )
}
