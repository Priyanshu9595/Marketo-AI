import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { Input } from '../components/Input'
import { useApi } from '../hooks/useApi'
import { useAuthContext } from '../context/AuthContext'

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
  const [client, setClient] = useState({ name: '', email: '', password: '' })
  const [clientMsg, setClientMsg] = useState('')
  const [clientErr, setClientErr] = useState('')
  const { post, loading } = useApi()
  const { requireAuth } = useAuthContext()

  const setC = (k) => (v) => setClient(prev => ({ ...prev, [k]: v }))

  const createClient = async () => {
    if (!requireAuth()) return
    setClientMsg(''); setClientErr('')
    if (!client.email || !client.password) {
      setClientErr('Email and password are required.')
      return
    }
    if (client.password.length < 6) {
      setClientErr('Password must be at least 6 characters.')
      return
    }
    try {
      const data = await post('/auth/client', client)
      setClientMsg(`✓ Client account created for ${data.user.email}`)
      setClient({ name: '', email: '', password: '' })
    } catch (err) {
      setClientErr(err.message || 'Could not create client account.')
    }
  }

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
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Manage appearance and client accounts</p>
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

      {/* Create client account */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Create client account</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
          Set up login credentials for a new client. They can then log in with this email and password.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Client name (optional)" value={client.name} onChange={setC('name')} placeholder="Client or brand name" />
          <Input label="Client email" type="email" value={client.email} onChange={setC('email')} placeholder="client@example.com" />
          <Input label="Password" type="password" value={client.password} onChange={setC('password')} placeholder="At least 6 characters" />
          {clientErr && <div style={{ fontSize: 13, color: 'var(--red)' }}>{clientErr}</div>}
          {clientMsg && <div style={{ fontSize: 13, color: 'var(--green)' }}>{clientMsg}</div>}
          <Button onClick={createClient} disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? 'Creating…' : 'Create client account'}
          </Button>
        </div>
      </Card>
    </div>
  )
}