import { useState, useEffect } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { Input, Select } from '../components/Input'
import { PLATFORM_COLORS, PLATFORMS } from '../utils/constants'
import { useAuthContext } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'

const STORAGE_KEY = 'marketo_posts'
const CONTENT_TYPES = ['Text', 'Image', 'Video']
const TYPE_ICONS = { Text: '📝', Image: '🖼️', Video: '🎬' }
const STATUS_COLORS = { scheduled: 'var(--accent)', posted: 'var(--green)', missed: 'var(--red)' }

// Combine a post's date + time into a Date object
const postDateTime = (p) => new Date(`${p.date}T${p.time || '00:00:00'}`)

// Derive status: posted (manual) → posted; past time → missed; else scheduled
const postStatus = (p) => {
  if (p.posted) return 'posted'
  if (postDateTime(p) < new Date()) return 'missed'
  return 'scheduled'
}

const fmtDate = (date) => {
  const d = new Date(`${date}T00:00:00`)
  if (isNaN(d)) return date
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

const fmtTime = (t) => {
  if (!t) return ''
  const [h, m, s] = t.split(':')
  const hh = +h
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const h12 = hh % 12 || 12
  return `${h12}:${m}:${s ?? '00'} ${ampm}`
}

const emptyForm = { date: '', time: '10:00:00', platform: 'Instagram', type: 'Text', text: '' }

export default function Calendar() {
  const [posts, setPosts]       = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyForm)
  const [error, setError]       = useState('')
  const [reminderMsg, setReminderMsg] = useState('')
  const { requireAuth, isLoggedIn } = useAuthContext()
  const { get, post, put, del } = useApi()

  // Load this user's posts from MongoDB when logged in
  useEffect(() => {
    if (!isLoggedIn) { setPosts([]); return }
    get('/social')
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load posts. Is the backend running?'))
  }, [isLoggedIn])

  // Mirror posts to localStorage so the reminder checker (useReminders) can see them
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
  }, [posts])

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const addPost = async () => {
    if (!requireAuth()) return
    if (!form.date || !form.time || !form.text.trim()) {
      setError('Please fill in date, time and caption.')
      return
    }
    setError('')
    try {
      const created = await post('/social', { ...form, posted: false })
      setPosts([...posts, created])
      setForm(emptyForm)
      setShowForm(false)
    } catch (err) {
      setError(err.message || 'Could not schedule post.')
    }
  }

  const markPosted = async (id) => {
    if (!requireAuth()) return
    try {
      const updated = await put(`/social/${id}`, { posted: true })
      setPosts(posts.map(p => p.id === id ? updated : p))
    } catch (err) {
      setError(err.message || 'Could not update post.')
    }
  }

  const deletePost = async (id) => {
    if (!requireAuth()) return
    try {
      await del(`/social/${id}`)
      setPosts(posts.filter(p => p.id !== id))
    } catch (err) {
      setError(err.message || 'Could not delete post.')
    }
  }

  const remindersOn = localStorage.getItem('reminders_enabled') === 'true'

  // Turn on app-wide reminders: grant permission + set the flag. The background
  // checker (useReminders) then notifies ~1 hour before each scheduled post.
  const enableReminders = () => {
    if (!('Notification' in window)) {
      setReminderMsg('This browser does not support notifications.')
      return
    }
    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') {
        setReminderMsg('Notifications were blocked. Allow them in your browser settings to get reminders.')
        return
      }
      localStorage.setItem('reminders_enabled', 'true')
      setReminderMsg("🔔 Reminders are ON — you'll be notified about 1 hour before each scheduled post, while this app is open in your browser.")
      // Send a quick confirmation notification so you know it works
      new Notification('Reminders enabled ✅', { body: "We'll remind you ~1 hour before each scheduled post." })
    })
  }

  // Sort posts by date+time ascending
  const sorted = [...posts].sort((a, b) => postDateTime(a) - postDateTime(b))
  const counts = { scheduled: 0, posted: 0, missed: 0 }
  posts.forEach(p => { counts[postStatus(p)]++ })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Social calendar</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 10px' }}>{posts.length} posts scheduled</p>
          <Button variant={remindersOn ? 'success' : 'ghost'} size="sm" onClick={enableReminders}>
            🔔 {remindersOn ? 'Reminders on' : 'Remind me 1h before'}
          </Button>
        </div>
        <Button onClick={() => { if (!requireAuth()) return; showForm ? setShowForm(false) : setShowForm(true) }}>
          + Schedule post
        </Button>
      </div>

      {reminderMsg && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
          {reminderMsg}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <Card style={{ border: '1px solid rgba(108,99,255,0.3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Input label="Date" type="date" value={form.date} onChange={set('date')} />
            <Input label="Time (hr:min:sec)" type="time" step="1" value={form.time} onChange={set('time')} />
            <Select label="Social media" value={form.platform} onChange={set('platform')} options={PLATFORMS} />
            <Select label="Content type" value={form.type} onChange={set('type')} options={CONTENT_TYPES} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Input label="Caption" value={form.text} onChange={set('text')} placeholder="Write your caption..." rows={3} />
          </div>
          {error && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={addPost}>Schedule</Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setError('') }}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Status summary */}
      <div style={{ display: 'flex', gap: 16 }}>
        {Object.entries(STATUS_COLORS).map(([s, color]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {counts[s]} {s}
          </div>
        ))}
      </div>

      {/* Posts list */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {sorted.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
            No posts yet. Click “+ Schedule post” to add one.
          </div>
        )}
        {sorted.map((p, i) => {
          const status = postStatus(p)
          const pColor = PLATFORM_COLORS[p.platform] || 'var(--accent)'
          return (
            <div key={p.id} style={{
              display: 'flex', gap: 14, alignItems: 'center', padding: 16,
              borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              {/* Platform avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: pColor + '22', color: pColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>{p.platform.slice(0, 2).toUpperCase()}</div>

              {/* Main */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{p.platform}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{TYPE_ICONS[p.type]} {p.type}</span>
                  <Badge color={STATUS_COLORS[status]}>{status}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                  📅 {fmtDate(p.date)} · ⏰ {fmtTime(p.time)}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{p.text}</p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                {status !== 'posted' && (
                  <Button size="sm" variant="success" onClick={() => markPosted(p.id)} style={{ fontSize: 11 }}>
                    Mark posted
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => deletePost(p.id)} style={{ fontSize: 11, justifyContent: 'center' }}>
                  Delete
                </Button>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
