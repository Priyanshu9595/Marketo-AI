import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { Input } from '../components/Input'

const FONT_SIZES = [
  { label: 'Small',       scale: '0.9'  },
  { label: 'Default',     scale: '1'    },
  { label: 'Large',       scale: '1.1'  },
  { label: 'Extra large', scale: '1.25' },
]

const THEMES = [
  { label: '🌙 Dark',  value: 'dark'  },
  { label: '☀️ Light', value: 'light' },
]

export default function Settings() {
  const [fontScale, setFontScale] = useState(localStorage.getItem('font_scale') || '1')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  const applyFontScale = (scale) => {
    setFontScale(scale)
    localStorage.setItem('font_scale', scale)
    document.documentElement.style.zoom = scale
  }

  const applyTheme = (value) => {
    setTheme(value)
    localStorage.setItem('theme', value)
    document.documentElement.setAttribute('data-theme', value)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Settings</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Configure your API keys and preferences</p>
      </div>

      {/* Appearance */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Appearance</div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>Font size</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FONT_SIZES.map(f => (
              <Button key={f.scale}
                variant={fontScale === f.scale ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => applyFontScale(f.scale)}>
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>Theme</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {THEMES.map(t => (
              <Button key={t.value}
                variant={theme === t.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => applyTheme(t.value)}>
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Account</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Brand name" value="" onChange={() => {}} placeholder="Your company name" />
          <Input label="Email"      value="" onChange={() => {}} placeholder="you@company.com" type="email" />
          <Button style={{ alignSelf: 'flex-start' }}>Update profile</Button>
        </div>
      </Card>
    </div>
  )
}