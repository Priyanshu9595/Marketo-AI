import { useRef, useState, useEffect } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { Input, Select } from '../components/Input'
import { PLATFORM_COLORS, PLATFORMS } from '../utils/constants'
import { engagementRevenue } from '../utils/helpers'
import { useAuthContext } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n || 0}`)

// Engagement metrics for a posted item + revenue it drives. Admins can edit the
// numbers (views/likes/shares/comments); revenue is recomputed automatically.
function Engagement({ post, onSave }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm] = useState({
    views: 0, likes: 0, shares: 0, comments: 0,
    rpm: 0,
    impressions: 0, clickRate: 0, conversionRate: 0, averageOrderValue: 0,
  })

  useEffect(() => {
    setForm({
      views: post.views || 0,
      likes: post.likes || 0,
      shares: post.shares || 0,
      comments: post.comments || 0,
      rpm: post.rpm || 0,
      impressions: post.impressions || 0,
      clickRate: post.clickRate || 0,
      conversionRate: post.conversionRate || 0,
      averageOrderValue: post.averageOrderValue || 0,
    })
  }, [post])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: Math.max(0, parseFloat(e.target.value || '0') || 0) }))

  const save = async () => {
    setSaving(true)
    try { await onSave(post.id, form); setEditing(false) } finally { setSaving(false) }
  }

  const FIELDS = post.platform === 'YouTube' && post.type === 'Video'
      ? [['views', 'Views'], ['rpm', 'RPM']]
      : post.type === 'Image'
      ? [['impressions', 'Impressions'], ['clickRate', 'Click rate %'], ['conversionRate', 'Conversion %'], ['averageOrderValue', 'Avg order value']]
      : [['views', 'Views'], ['likes', 'Likes'], ['shares', 'Shares'], ['comments', 'Comments']]

  if (editing) {
    return (
      <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(FIELDS.length, 4)}, 1fr)`, gap: 8 }}>
          {FIELDS.map(([k, label]) => (
            <label key={k} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
              <input type="number" min="0" value={form[k]} onChange={set(k)}
                style={{ width: '100%', marginTop: 4, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
            </label>
          ))}
        </div>
        {post.platform === 'YouTube' && post.type === 'Video' && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
            YouTube video revenue = Views / 1000 * RPM.
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Revenue: Rs {engagementRevenue({ ...post, ...form }).toLocaleString()}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save metrics'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        👁 {compact(post.views)} · ❤️ {compact(post.likes)} · 🔁 {compact(post.shares)} · 💬 {compact(post.comments)}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Revenue: Rs {engagementRevenue(post).toLocaleString()}</span>
      <button onClick={() => setEditing(true)}
        style={{ fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>
        Edit metrics
      </button>
    </div>
  )
}

const CONTENT_TYPES = ['Text message', 'Image', 'Video']
const POST_METHODS = ['Feed', 'Story']
const REAL_POSTING_PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn']
const EXTERNAL_WORKFLOW_PLATFORMS = ['YouTube']
const METHOD_PLATFORMS = ['Instagram', 'Facebook']
const MEDIA_PLATFORMS = [...REAL_POSTING_PLATFORMS, ...EXTERNAL_WORKFLOW_PLATFORMS]
const TYPE_ICONS = { Text: '📝', Image: '🖼️', Video: '🎬' }
const STATUS_COLORS = { scheduled: 'var(--accent)', posting: 'var(--amber)', retrying: 'var(--amber)', posted: 'var(--green)', missed: 'var(--red)' }
const DAYS_HEADER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SCHEDULE_TIME_ZONE_OFFSET = '+05:30'
const pad = (n) => String(n).padStart(2, '0')
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

// Combine a post's date + time into a Date object
const postDateTime = (p) => new Date(`${p.date}T${p.time || '00:00:00'}${SCHEDULE_TIME_ZONE_OFFSET}`)

// A post isn't "missed" the instant its time passes — the auto-poster needs a
// moment to pick it up. Give a 1-minute grace window (show "posting"), and only
// mark it missed once now > scheduled time + 1 minute.
const MISSED_GRACE_MS = 60 * 1000

// Derive status: posted → posted; just-due → posting; long-overdue → missed; else scheduled
const postStatus = (p) => {
  if (p.posted) return 'posted'
  if (p.posting) return 'posting'
  if (p.nextPostAttemptAt && new Date(p.nextPostAttemptAt) > new Date()) return 'retrying'
  if (EXTERNAL_WORKFLOW_PLATFORMS.includes(p.platform) && !p.postError) return 'scheduled'
  const overdueMs = Date.now() - postDateTime(p).getTime()
  if (REAL_POSTING_PLATFORMS.includes(p.platform) && overdueMs >= 0 && !p.postError) return 'posting'
  if (overdueMs > MISSED_GRACE_MS) return 'missed'
  if (overdueMs >= 0) return 'posting' // due, within the grace window
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
  return `${h12}:${m} ${ampm}`
}

const normalizeTimeForSave = (time) => {
  const [h = '10', m = '00', s = '00'] = String(time || '10:00').split(':')
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${(s || '00').padStart(2, '0')}`
}

const emptyForm = {
  date: '', time: '10:00', platform: 'Instagram', type: 'Image',
  postMethod: 'Feed', postMethods: ['Feed'], text: '', mediaUrl: '',
  youtubeTitle: '', youtubeDescription: '', youtubeTags: '', rpm: 40,
}

export default function Calendar() {
  const [posts, setPosts]       = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyForm)
  const [mediaUpload, setMediaUpload] = useState(null)
  const [error, setError]       = useState('')
  const [reminderMsg, setReminderMsg] = useState('')
  const [remindersOn, setRemindersOn] = useState(false)
  const [viewDate, setViewDate]       = useState(() => new Date()) // month being viewed
  const [selectedDate, setSelectedDate] = useState(null)           // 'YYYY-MM-DD'
  const { requireAuth, isLoggedIn } = useAuthContext()
  const { get, post, put, del } = useApi()
  const mediaFileRef = useRef(null)

  // Load this user's posts from MongoDB when logged in
  useEffect(() => {
    if (!isLoggedIn) { setPosts([]); return }
    get('/social')
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load posts. Is the backend running?'))
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) return
    const refreshPosts = () => {
      get('/social')
        .then(data => setPosts(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
    window.addEventListener('marketo-auto-refresh', refreshPosts)
    return () => {
      window.removeEventListener('marketo-auto-refresh', refreshPosts)
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) return

    const autoPostDue = async () => {
      const duePosts = posts.filter(p =>
        !p.posted &&
        !REAL_POSTING_PLATFORMS.includes(p.platform) &&
        !EXTERNAL_WORKFLOW_PLATFORMS.includes(p.platform) &&
        postDateTime(p) <= new Date()
      )
      if (!duePosts.length) return

      for (const due of duePosts) {
        try {
          const updated = await put(`/social/${due.id}`, {
            posted: true,
            autoPosted: true,
            postedAt: new Date().toISOString(),
          })
          setPosts(prev => prev.map(p => p.id === due.id ? updated : p))
          window.dispatchEvent(new CustomEvent('marketo-reminder-popup', {
            detail: {
              title: 'Auto posted',
              message: `Your content has been auto posted on ${due.platform}.`,
              platform: due.platform,
              type: due.type,
              text: due.text,
            },
          }))
        } catch {
          // The backend also auto-posts due items when posts are fetched.
        }
      }
    }

    autoPostDue()
    const iv = setInterval(autoPostDue, 10000)
    return () => clearInterval(iv)
  }, [isLoggedIn, posts])

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const setPlatform = (platform) => {
    setForm(f => ({
      ...f,
      platform,
      type: platform === 'YouTube' ? 'Video' : f.type,
      postMethod: platform === 'YouTube' ? 'Video' : 'Feed',
      postMethods: platform === 'YouTube' ? ['Video'] : ['Feed'],
      mediaUrl: '',
    }))
    setMediaUpload(null)
  }

  const togglePostMethod = (method) => {
    setForm(f => {
      const selected = f.postMethods || [f.postMethod || 'Feed']
      const next = selected.includes(method)
        ? selected.filter(item => item !== method)
        : [...selected, method]
      const safeNext = next.length ? next : [method]
      return { ...f, postMethods: safeNext, postMethod: safeNext[0] }
    })
  }

  const chooseMediaFile = (file) => {
    if (!file) return
    const isVideo = ['video/mp4', 'video/quicktime', 'video/mov'].includes(file.type) || /\.(mp4|mov)$/i.test(file.name)
    if (form.platform === 'YouTube' && !isVideo) {
      setError('YouTube upload supports video files only. Please choose MP4 or MOV.')
      return
    }

    const supported =
      ['image/jpeg', 'image/jpg', 'image/pjpeg', 'video/mp4', 'video/quicktime', 'video/mov'].includes(file.type) ||
      /\.(jpe?g|mp4|mov)$/i.test(file.name)

    if (!supported) {
      setError('Upload supports JPG/JPEG images or MP4/MOV videos only.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Please upload a file smaller than 20 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setMediaUpload({
        name: file.name,
        mimeType: file.type,
        dataUrl: reader.result,
      })
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const addPost = async () => {
    if (!requireAuth()) return
    if (!form.date || !form.time || !form.text.trim()) {
      setError('Please fill in date, time and caption.')
      return
    }
    if (form.platform === 'YouTube' && !form.mediaUrl.trim() && !mediaUpload) {
      setError('Please add a YouTube video URL or upload an MP4/MOV video file.')
      return
    }
    setError('')
    try {
      const selectedMethods = REAL_POSTING_PLATFORMS.includes(form.platform)
        ? (METHOD_PLATFORMS.includes(form.platform) && form.postMethods?.length ? form.postMethods : ['Feed'])
        : form.platform === 'YouTube'
          ? ['Video']
        : ['Feed']
      const mediaPayload = mediaUpload ? {
        name: mediaUpload.name,
        mimeType: mediaUpload.mimeType,
        data: mediaUpload.dataUrl?.split(',')[1],
      } : null
      const createdPosts = []

      for (const method of selectedMethods) {
        const created = await post('/social', {
          ...form,
          postMethod: method,
          postMethods: undefined,
          type: form.platform === 'YouTube' ? 'Video' : form.type,
          time: normalizeTimeForSave(form.time),
          posted: false,
          mediaUpload: mediaPayload,
        })
        createdPosts.push(created)
      }

      setPosts([...posts, ...createdPosts])
      setForm(emptyForm)
      setMediaUpload(null)
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

  const retryPost = async (id) => {
    if (!requireAuth()) return
    try {
      await put(`/social/${id}`, { retryPosting: true })
      const data = await get('/social')
      setPosts(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Could not retry post.')
    }
  }

  // Soft delete: keep the item in posting history (marked "deleted"), but drop it
  // from the active calendar and the dashboard totals.
  const deletePost = async (id) => {
    if (!requireAuth()) return
    try {
      const updated = await put(`/social/${id}`, { deleted: true })
      setPosts(posts.map(p => p.id === id ? updated : p))
    } catch (err) {
      setError(err.message || 'Could not delete post.')
    }
  }

  const saveMetrics = async (id, metrics) => {
    if (!requireAuth()) return
    try {
      const updated = await put(`/social/${id}`, metrics)
      setPosts(prev => prev.map(p => p.id === id ? updated : p))
    } catch (err) {
      setError(err.message || 'Could not update engagement metrics.')
    }
  }

  const showReminderTest = () => {
    window.dispatchEvent(new CustomEvent('marketo-reminder-popup', {
      detail: {
        title: 'Reminder',
        message: 'You have left 1 hour to share content on Instagram.',
        platform: 'Instagram',
        type: 'Test',
        text: 'This is a test popup reminder.',
      },
    }))
    window.dispatchEvent(new Event('marketo-check-reminders'))
  }

  // Turn on app-wide reminders: grant permission + set the flag. The background
  // checker (useReminders) then notifies ~1 hour before each scheduled post.
  const enableReminders = () => {
    if (!('Notification' in window)) {
      setRemindersOn(true)
      setReminderMsg('In-app reminder popups are ON. You will see popup reminders while this app is open.')
      showReminderTest()
      return
    }
    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') {
        setRemindersOn(true)
        setReminderMsg('Chrome notifications are blocked, so in-app reminder popups are ON while this app is open.')
        showReminderTest()
        return
      }
      setRemindersOn(true)
      setReminderMsg("🔔 Reminders are ON — you'll be notified about 1 hour before each scheduled post, while this app is open in your browser.")
      // Send a quick confirmation notification so you know it works
      new Notification('Reminders enabled ✅', { body: "We'll remind you ~1 hour before each scheduled post." })
    })
  }

  // Active (non-deleted) posts drive the calendar grid + status counts.
  const livePosts = posts.filter(p => !p.deleted)
  const sorted = [...livePosts].sort((a, b) => postDateTime(a) - postDateTime(b))
  const counts = { scheduled: 0, posting: 0, retrying: 0, posted: 0, missed: 0 }
  livePosts.forEach(p => { counts[postStatus(p)]++ })

  // Calendar month math
  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay    = new Date(year, month, 1).getDay()
  const now = new Date()
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate())
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const changeMonth = (delta) => { setViewDate(new Date(year, month + delta, 1)); setSelectedDate(null) }
  const selectedPosts = selectedDate ? sorted.filter(p => p.date === selectedDate) : []
  const postedHistory = [...posts]
    .filter(p => p.posted)
    .sort((a, b) => new Date(b.postedAt || postDateTime(b)) - new Date(a.postedAt || postDateTime(a)))
  const contentTypeOptions = form.platform === 'YouTube' ? ['Video'] : CONTENT_TYPES

  return (
    <div className="calendar-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Social calendar</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 10px' }}>{posts.length} posts scheduled</p>
          <Button variant={remindersOn ? 'success' : 'ghost'} size="sm" onClick={enableReminders}>
            🔔 {remindersOn ? 'Reminders on' : 'Remind me 1h before'}
          </Button>
        </div>
        <Button onClick={() => {
          if (!requireAuth()) return
          if (showForm) { setShowForm(false); return }
          setForm({ ...emptyForm, date: selectedDate || '' }) // prefill the selected day
          setMediaUpload(null)
          setShowForm(true)
        }}>
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
            <Input label="Time" type="time" value={form.time} onChange={set('time')} />
            <Select label="Social media" value={form.platform} onChange={setPlatform} options={PLATFORMS} />
            <Select label="Content type" value={form.type} onChange={set('type')} options={contentTypeOptions} />
          </div>
          {MEDIA_PLATFORMS.includes(form.platform) && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {METHOD_PLATFORMS.includes(form.platform) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text-dim)',
                    letterSpacing: '0.07em', textTransform: 'uppercase',
                  }}>
                    {form.platform} method
                  </label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {POST_METHODS.map(method => {
                      const active = (form.postMethods || [form.postMethod || 'Feed']).includes(method)
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => togglePostMethod(method)}
                          style={{
                            border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                            background: active ? 'var(--accent-soft)' : 'var(--surface-alt)',
                            color: active ? 'var(--accent-mid)' : 'var(--text)',
                            borderRadius: 10,
                            padding: '10px 14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {active ? '[x] ' : ''}{method}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <Input
                label={`${form.platform} media URL`}
                value={form.mediaUrl}
                onChange={set('mediaUrl')}
                placeholder={form.platform === 'YouTube' ? 'Public video URL for n8n YouTube upload' : `Public image/video URL required for ${form.platform} posting`}
              />
              {form.platform === 'YouTube' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Input label="YouTube title" value={form.youtubeTitle} onChange={set('youtubeTitle')} placeholder="Video title" />
                  <Input label="RPM" type="number" value={form.rpm} onChange={set('rpm')} placeholder="e.g. 40" />
                  <Input label="YouTube tags" value={form.youtubeTags} onChange={set('youtubeTags')} placeholder="tag1, tag2, tag3" />
                  <Input label="YouTube description" value={form.youtubeDescription} onChange={set('youtubeDescription')} placeholder="Video description" />
                </div>
              )}
              <input
                ref={mediaFileRef}
                type="file"
                accept={form.platform === 'YouTube' ? 'video/mp4,video/quicktime,.mp4,.mov' : 'image/jpeg,image/pjpeg,video/mp4,video/quicktime,.jpg,.jpeg,.mp4,.mov'}
                style={{ display: 'none' }}
                onChange={(e) => { chooseMediaFile(e.target.files?.[0]); e.target.value = '' }}
              />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button size="sm" variant="ghost" onClick={() => mediaFileRef.current?.click()}>
                  Upload from device
                </Button>
                {mediaUpload && (
                  <>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{mediaUpload.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => setMediaUpload(null)}>Remove</Button>
                  </>
                )}
              </div>
              {mediaUpload?.mimeType?.startsWith('image/') && (
                <img
                  src={mediaUpload.dataUrl}
                  alt={mediaUpload.name}
                  style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
                />
              )}
              {mediaUpload?.mimeType?.startsWith('video/') && (
                <video
                  src={mediaUpload.dataUrl}
                  controls
                  style={{ width: 220, maxWidth: '100%', borderRadius: 10, border: '1px solid var(--border)' }}
                />
              )}
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {form.platform === 'YouTube'
                  ? 'n8n can use this scheduled YouTube video data. Revenue formula: Video Revenue = Views / 1000 * RPM.'
                  : `Uploaded files work for ${form.platform} only when backend/.env has BACKEND_PUBLIC_URL set to a public HTTPS backend URL.`}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <Input label="Content by me" value={form.text} onChange={set('text')} placeholder="Write your content..." rows={3} />
          </div>
          {error && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={addPost}>Schedule</Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setMediaUpload(null); setError('') }}>Cancel</Button>
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

      {/* Calendar grid */}
      <Card style={{ padding: 16 }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Button size="sm" variant="ghost" onClick={() => changeMonth(-1)}>‹ Prev</Button>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{monthLabel}</div>
          <Button size="sm" variant="ghost" onClick={() => changeMonth(1)}>Next ›</Button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {DAYS_HEADER.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: firstDay }, (_, i) => <div key={'e' + i} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const ds = dateKey(year, month, day)
            const dayPosts = livePosts.filter(p => p.date === ds)
            const isToday = ds === todayKey
            const isSelected = selectedDate === ds
            return (
              <div key={day}
                onClick={() => setSelectedDate(isSelected ? null : ds)}
                style={{
                  minHeight: 64, padding: 6, borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--accent-soft)' : 'var(--surface-alt)',
                  transition: 'all 0.15s',
                }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, marginBottom: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: '50%',
                  background: isToday ? 'var(--accent)' : 'transparent',
                  color: isToday ? '#fff' : isSelected ? 'var(--accent-mid)' : 'var(--text-muted)',
                }}>{day}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {dayPosts.slice(0, 4).map((p) => (
                    <span key={p.id} title={`${p.platform} · ${postStatus(p)}`}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLORS[postStatus(p)] }} />
                  ))}
                  {dayPosts.length > 4 && <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>+{dayPosts.length - 4}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Selected day details */}
      {selectedDate && (
        <Card style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(108,99,255,0.3)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtDate(selectedDate)} · {selectedPosts.length} post(s)</div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedDate(null)}>Close</Button>
          </div>
          {selectedPosts.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
              No posts on this date.
            </div>
          ) : selectedPosts.map((p, i) => {
            const status = postStatus(p)
            const pColor = PLATFORM_COLORS[p.platform] || 'var(--accent)'
            return (
              <div key={p.id} style={{
                display: 'flex', gap: 14, alignItems: 'center', padding: 16,
                borderBottom: i < selectedPosts.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: pColor + '22', color: pColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                }}>{p.platform.slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{p.platform}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{TYPE_ICONS[p.type] || p.type} {p.type}</span>
                    {REAL_POSTING_PLATFORMS.includes(p.platform) && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.postMethod || 'Feed'}</span>
                    )}
                    <Badge color={STATUS_COLORS[status]}>{status}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>⏰ {fmtTime(p.time)}</div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{p.text}</p>
                  {p.mediaUrl && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, wordBreak: 'break-word' }}>Media: {p.mediaUrl}</div>
                  )}
                  {p.externalPostId && (
                    <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>{p.platform} post ID: {p.externalPostId}</div>
                  )}
                  {p.postError && (
                    <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>Posting error: {p.postError}</div>
                  )}
                  {status === 'posted' && <Engagement post={p} onSave={saveMetrics} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {status !== 'posted' && p.postError && REAL_POSTING_PLATFORMS.includes(p.platform) && (
                    <Button size="sm" variant="ghost" onClick={() => retryPost(p.id)} style={{ fontSize: 11 }}>Retry post</Button>
                  )}
                  {status !== 'posted' && (
                    <Button size="sm" variant="success" onClick={() => markPosted(p.id)} style={{ fontSize: 11 }}>Mark posted</Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => deletePost(p.id)} style={{ fontSize: 11, justifyContent: 'center' }}>Delete</Button>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>Posting history</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{postedHistory.length} posted item(s)</div>
          </div>
        </div>
        {postedHistory.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
            No posted content yet.
          </div>
        ) : postedHistory.map((p, i) => {
          const pColor = PLATFORM_COLORS[p.platform] || 'var(--accent)'
          return (
            <div key={p.id} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start', padding: 16,
              borderBottom: i < postedHistory.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: pColor + '22', color: pColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>{p.platform.slice(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{p.platform}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{TYPE_ICONS[p.type] || p.type} {p.type}</span>
                  {REAL_POSTING_PLATFORMS.includes(p.platform) && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.postMethod || 'Feed'}</span>
                  )}
                  <Badge color="var(--green)">posted</Badge>
                  {p.deleted
                    ? <Badge color="var(--red)">deleted</Badge>
                    : (p.autoPosted && <Badge color="var(--accent)">auto</Badge>)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                  {fmtDate(p.date)} at {fmtTime(p.time)}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{p.text}</p>
                {p.externalPostId && (
                  <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>{p.platform} post ID: {p.externalPostId}</div>
                )}
                {p.mediaUrl && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, wordBreak: 'break-word' }}>Media: {p.mediaUrl}</div>
                )}
                <Engagement post={p} onSave={saveMetrics} />
              </div>
              {!p.deleted && (
                <Button size="sm" variant="danger" onClick={() => deletePost(p.id)} style={{ fontSize: 11, flexShrink: 0 }}>Delete</Button>
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
