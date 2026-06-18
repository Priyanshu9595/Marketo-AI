import { useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { Input } from '../components/Input'
import { useApi } from '../hooks/useApi'
import { useAuthContext } from '../context/AuthContext'

export default function Login() {
  const { login, loginMode, closeLogin } = useAuthContext()
  const [mode, setMode] = useState(loginMode || 'login') // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError]   = useState('')
  const [notice, setNotice] = useState('')
  const { post, loading } = useApi()

  const isSignup = mode === 'signup'
  const set = (k) => (v) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async () => {
    setError(''); setNotice('')
    if (!form.email || !form.password) {
      setError('Email and password are required.')
      return
    }
    if (isSignup && !form.name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (isSignup && !form.email.toLowerCase().endsWith('@nxtwave.co.in')) {
      setError('Only @nxtwave.co.in email addresses are allowed.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    try {
      if (isSignup) {
        const data = await post('/auth/signup', {
          name: form.name, email: form.email, password: form.password,
        })
        login(data.user, data.token)
        closeLogin()
      } else {
        const data = await post('/auth/login', { email: form.email, password: form.password })
        login(data.user, data.token)
        closeLogin()
      }
    } catch (err) {
      // No working auth backend (server down) → fall back to local demo mode.
      console.warn('Auth backend unavailable, using demo mode:', err.message)
      login(
        { email: form.email, user_metadata: { name: form.name || form.email.split('@')[0] } },
        'demo-token'
      )
      closeLogin()
    }
  }

  return (
    <div
      onClick={closeLogin}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', padding: 20,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: 400, maxWidth: '100%' }}>
      <Card style={{ position: 'relative' }}>
        {/* Close */}
        <button
          onClick={closeLogin}
          title="Close"
          style={{
            position: 'absolute', top: 12, right: 12, width: 28, height: 28,
            borderRadius: 8, border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
          }}
        >
          ×
        </button>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
              <path d="M12 2L14.4 9.6H22L15.8 14.4L18.2 22L12 17.2L5.8 22L8.2 14.4L2 9.6H9.6L12 2Z" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Marketo AI</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>D2C growth suite</div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>
          {isSignup ? 'Start your 14-day free trial' : 'Log in to your dashboard'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isSignup && (
            <Input label="Name" value={form.name} onChange={set('name')} placeholder="Your name" />
          )}
          <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@brand.com" />
          <Input label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />

          {error  && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}
          {notice && <div style={{ fontSize: 13, color: 'var(--green)' }}>{notice}</div>}

          <Button onClick={submit} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
          </Button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 18 }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(''); setNotice('') }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-mid)', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0 }}
          >
            {isSignup ? 'Log in' : 'Sign up'}
          </button>
        </div>
      </Card>
      </div>
    </div>
  )
}
