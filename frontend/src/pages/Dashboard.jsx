import { useState, useEffect } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import BarChart from '../components/BarChart'
import { Input, Select } from '../components/Input'
import { formatINR, calcROAS, calcCAC, getCampaignStatus, monthlyRevenue } from '../utils/helpers'
import { useAuthContext } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'

function StatCard({ label, value, sub, color, icon }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color, marginTop: 4, fontWeight: 500 }}>{sub}</div>}
        </div>
        <div style={{ background: color + '22', borderRadius: 10, padding: 10, color, fontSize: 18 }}>{icon}</div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState(null)
  const [error, setError]         = useState('')
  const [form, setForm] = useState({ name: '', platform: 'Meta', spend: '', revenue: '', start: '', end: '' })
  const { requireAuth, isLoggedIn } = useAuthContext()
  const { get, post, put, del } = useApi()

  // Load this user's campaigns from MongoDB when logged in
  useEffect(() => {
    if (!isLoggedIn) { setCampaigns([]); return }
    get('/campaigns')
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load campaigns. Is the backend running?'))
  }, [isLoggedIn])

  // A campaign's live status: driven by its dates if set, else its stored status
  const statusOf = (c) => (c.start || c.end) ? getCampaignStatus(c.start, c.end) : (c.status || 'active')

  const totalSpend = campaigns.reduce((a, b) => a + b.spend, 0)
  const totalRev   = campaigns.reduce((a, b) => a + b.revenue, 0)
  const avgROAS    = totalSpend ? (totalRev / totalSpend).toFixed(1) : '0.0'

  // 12-month revenue trend, campaign revenue spread across the months it runs
  const chartData = monthlyRevenue(campaigns)

  // Platform split by total ad spend, derived from real campaigns
  const PLATFORM_PALETTE = {
    Meta: 'var(--accent)', Google: 'var(--green)', Instagram: '#E1306C',
    YouTube: 'var(--red)', Others: 'var(--amber)',
  }
  const platformSplit = (() => {
    const byPlatform = {}
    campaigns.forEach(c => { byPlatform[c.platform] = (byPlatform[c.platform] || 0) + c.spend })
    const total = Object.values(byPlatform).reduce((a, b) => a + b, 0)
    return Object.entries(byPlatform)
      .map(([name, spend]) => ({
        name,
        pct: total ? Math.round((spend / total) * 100) : 0,
        color: PLATFORM_PALETTE[name] || 'var(--amber)',
      }))
      .sort((a, b) => b.pct - a.pct)
  })()

  const resetForm = () => {
    setForm({ name: '', platform: 'Meta', spend: '', revenue: '', start: '', end: '' })
    setEditId(null)
    setError('')
    setShowForm(false)
  }

  const saveCampaign = async () => {
    if (!requireAuth()) return
    if (!form.name.trim() || !form.spend || !form.revenue) {
      setError('Please fill in campaign name, ad spend and revenue.')
      return
    }
    if (form.start && form.end && form.end < form.start) {
      setError('End date cannot be before the start date.')
      return
    }
    const fields = {
      name: form.name,
      platform: form.platform,
      spend: +form.spend,
      revenue: +form.revenue,
      clicks: Math.floor(+form.spend / 6),
      start: form.start,
      end: form.end,
    }
    try {
      if (editId) {
        const updated = await put(`/campaigns/${editId}`, fields)
        setCampaigns(campaigns.map(c => c.id === editId ? updated : c))
      } else {
        const created = await post('/campaigns', fields)
        setCampaigns([created, ...campaigns])
      }
      resetForm()
    } catch (err) {
      setError(err.message || 'Could not save campaign.')
    }
  }

  const startEdit = (c) => {
    if (!requireAuth()) return
    setForm({
      name: c.name, platform: c.platform,
      spend: String(c.spend), revenue: String(c.revenue),
      start: c.start || '', end: c.end || '',
    })
    setEditId(c.id)
    setError('')
    setShowForm(true)
  }

  const deleteCampaign = async (id) => {
    if (!requireAuth()) return
    try {
      await del(`/campaigns/${id}`)
      setCampaigns(campaigns.filter(c => c.id !== id))
      if (editId === id) resetForm()
    } catch (err) {
      setError(err.message || 'Could not delete campaign.')
    }
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Campaign ROI</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Track spend, attribution & returns across platforms</p>
        </div>
        <Button onClick={() => { if (!requireAuth()) return; showForm ? resetForm() : setShowForm(true) }}>+ New campaign</Button>
      </div>

      {/* Add / edit form */}
      {showForm && (
        <Card style={{ border: '1px solid rgba(108,99,255,0.3)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            {editId ? 'Edit campaign' : 'New campaign'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Input label="Campaign name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Diwali Sale 2025" />
            <Select label="Platform" value={form.platform} onChange={v => setForm({ ...form, platform: v })}
              options={['Meta', 'Google', 'Instagram', 'YouTube', 'Others']} />
            <Input label="Ad spend (₹)" type="number" value={form.spend} onChange={v => setForm({ ...form, spend: v })} placeholder="28000" />
            <Input label="Revenue generated (₹)" type="number" value={form.revenue} onChange={v => setForm({ ...form, revenue: v })} placeholder="112000" />
            <Input label="Start date" type="date" value={form.start} onChange={v => setForm({ ...form, start: v })} />
            <Input label="End date" type="date" value={form.end} onChange={v => setForm({ ...form, end: v })} />
          </div>
          {error && (
            <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={saveCampaign}>{editId ? 'Save changes' : 'Add campaign'}</Button>
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="Total spend"       value={formatINR(totalSpend)} sub="This month"          color="var(--accent)" icon="💸" />
        <StatCard label="Total revenue"     value={formatINR(totalRev)}   sub="+28% vs last month"  color="var(--green)"  icon="📈" />
        <StatCard label="Avg ROAS"          value={`${avgROAS}x`}         sub="Above 3x target"     color="var(--amber)"  icon="⚡" />
        <StatCard label="Active campaigns"  value={campaigns.filter(c => statusOf(c) === 'active').length} sub="2 platforms" color="var(--accent)" icon="🎯" />
      </div>

      {/* Charts */}
      <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Revenue trend (12 months)</div>
          {campaigns.length > 0 ? (
            <BarChart data={chartData} height={110} />
          ) : (
            <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              No campaigns yet — add one to see the chart.
            </div>
          )}
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Platform split (by spend)</div>
          {platformSplit.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>No campaigns yet.</div>
          ) : platformSplit.map(({ name, pct, color }) => (
            <div key={name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{name}</span>
                <span style={{ fontSize: 13, color, fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface-alt)', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Campaign', 'Platform', 'Spend', 'Revenue', 'ROAS', 'CAC', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
                  No campaigns yet. Click “+ New campaign” to add one.
                </td>
              </tr>
            )}
            {campaigns.map((c, i) => (
              <tr key={c.id}
                style={{ borderBottom: i < campaigns.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 14 }}>{c.name}</td>
                <td style={{ padding: '14px 16px' }}><Badge color={c.platform === 'Meta' ? 'var(--accent)' : 'var(--green)'}>{c.platform}</Badge></td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 14 }}>₹{c.spend.toLocaleString()}</td>
                <td style={{ padding: '14px 16px', color: 'var(--green)', fontWeight: 700, fontSize: 14 }}>₹{c.revenue.toLocaleString()}</td>
                <td style={{ padding: '14px 16px' }}><Badge color={+calcROAS(c.revenue, c.spend) > 3 ? 'var(--green)' : 'var(--amber)'}>{calcROAS(c.revenue, c.spend)}x</Badge></td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 14 }}>₹{calcCAC(c.spend, c.clicks)}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    title={c.start || c.end ? `${c.start || '—'} → ${c.end || '—'}` : 'No dates set'}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 12, fontWeight: 600,
                      color: statusOf(c) === 'active' ? 'var(--green)'
                        : statusOf(c) === 'scheduled' ? 'var(--accent)'
                        : 'var(--amber)',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                    {statusOf(c)}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => startEdit(c)}
                      title="Edit campaign"
                      style={{
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        padding: '4px 10px', borderRadius: 6,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCampaign(c.id)}
                      title="Delete campaign"
                      style={{
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        padding: '4px 10px', borderRadius: 6,
                        border: '1px solid var(--red)', background: 'transparent',
                        color: 'var(--red)',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  )
}