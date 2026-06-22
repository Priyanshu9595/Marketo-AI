import { useState, useEffect } from 'react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import BarChart from '../components/BarChart'
import { formatINR, calcROAS, calcCAC, postSpend, engagementRevenue } from '../utils/helpers'
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

const PLATFORM_PALETTE = {
  Instagram: '#E1306C',
  Facebook: '#1877F2',
  LinkedIn: '#0A66C2',
  YouTube: 'var(--red)',
  X: 'var(--text-muted)',
  Pinterest: '#E60023',
}

const monthLabel = (date) => {
  const d = new Date(`${date || new Date().toISOString().slice(0, 10)}T00:00:00`)
  return isNaN(d) ? new Date().getMonth() : d.getMonth()
}

export default function Dashboard() {
  const [posts, setPosts] = useState([])
  const [error, setError] = useState('')
  const { isLoggedIn } = useAuthContext()
  const { get } = useApi()

  useEffect(() => {
    if (!isLoggedIn) {
      setPosts([])
      return
    }

    const loadPosts = () => {
      get('/social')
        .then(data => setPosts(Array.isArray(data) ? data : []))
        .catch(() => setError('Could not load uploaded content. Is the backend running?'))
    }

    loadPosts()
    window.addEventListener('marketo-auto-refresh', loadPosts)
    return () => window.removeEventListener('marketo-auto-refresh', loadPosts)
  }, [isLoggedIn])

  const livePosts = posts.filter(p => !p.deleted)
  const historyPosts = posts.filter(p => p.deleted && p.posted) // deleted but already posted
  const allBilledPosts = [...livePosts, ...historyPosts]        // all posts that count for spend/revenue

  const postedPosts = allBilledPosts.filter(p => p.posted)

  const platformRows = Object.values(allBilledPosts.reduce((acc, post) => {
    const platform = post.platform || 'Other'
    const row = acc[platform] || {
      id: platform,
      name: `${platform} uploaded content`,
      platform,
      spend: 0,
      revenue: 0,
      clicks: 0,
      posts: 0,
      posted: 0,
      firstDate: post.date,
      lastDate: post.date,
    }

    row.spend += postSpend(post)
    row.revenue += post.posted ? engagementRevenue(post) : 0
    row.clicks += (post.views || post.impressions || 0)
    row.posts += 1
    row.posted += post.posted ? 1 : 0
    row.firstDate = !row.firstDate || post.date < row.firstDate ? post.date : row.firstDate
    row.lastDate = !row.lastDate || post.date > row.lastDate ? post.date : row.lastDate
    acc[platform] = row
    return acc
  }, {})).sort((a, b) => b.spend - a.spend)

  const totalSpend = allBilledPosts.reduce((sum, post) => sum + postSpend(post), 0)
  const totalRev = postedPosts.reduce((sum, post) => sum + engagementRevenue(post), 0)
  const avgROAS = totalSpend ? (totalRev / totalSpend).toFixed(1) : '0.0'

  const chartData = (() => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const totals = Array(12).fill(0)
    postedPosts.forEach(post => { totals[monthLabel(post.date)] += engagementRevenue(post) })
    return labels.map((label, i) => ({ label, value: Math.round(totals[i]) }))
  })()

  const platformSplit = (() => {
    const total = platformRows.reduce((sum, row) => sum + row.spend, 0)
    return platformRows.map(row => ({
      name: row.platform,
      pct: total ? Math.round((row.spend / total) * 100) : 0,
      color: PLATFORM_PALETTE[row.platform] || 'var(--amber)',
    }))
  })()

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Campaign ROI</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Auto fetched from uploaded and posted content</p>
        </div>
      </div>

      {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}

      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="Total spend" value={formatINR(totalSpend)} sub={`${allBilledPosts.length} item(s) incl. history`} color="var(--accent)" icon="$" />
        <StatCard label="Total revenue" value={formatINR(totalRev)} sub={`${postedPosts.length} posted item(s)`} color="var(--green)" icon="^" />
        <StatCard label="Avg ROAS" value={`${avgROAS}x`} sub="From posted engagement" color="var(--amber)" icon="x" />
        <StatCard label="Active platforms" value={platformRows.length} sub="Auto fetched" color="var(--accent)" icon="@" />
      </div>

      <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Revenue trend (12 months)</div>
          {postedPosts.length > 0 ? (
            <BarChart data={chartData} height={110} />
          ) : (
            <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              No posted content yet. Revenue appears after content is posted and metrics are updated.
            </div>
          )}
        </Card>
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Platform split (by spend)</div>
          {platformSplit.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>No uploaded content yet.</div>
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

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Content source', 'Platform', 'Spend', 'Revenue', 'ROAS', 'CAC', 'Status', 'Posts'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {platformRows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
                    No uploaded content yet. Schedule or upload content in Social calendar.
                  </td>
                </tr>
              )}
              {platformRows.map((row, i) => (
                <tr key={row.id} style={{ borderBottom: i < platformRows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 14 }}>{row.name}</td>
                  <td style={{ padding: '14px 16px' }}><Badge color={PLATFORM_PALETTE[row.platform] || 'var(--green)'}>{row.platform}</Badge></td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 14 }}>{formatINR(row.spend)}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--green)', fontWeight: 700, fontSize: 14 }}>{formatINR(row.revenue)}</td>
                  <td style={{ padding: '14px 16px' }}><Badge color={+calcROAS(row.revenue, row.spend) > 3 ? 'var(--green)' : 'var(--amber)'}>{calcROAS(row.revenue, row.spend)}x</Badge></td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 14 }}>{formatINR(calcCAC(row.spend, row.clicks || row.posts))}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>auto</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 14 }}>{row.posted}/{row.posts} posted</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Per-post breakdown: active + history, same style as Social Calendar */}
      {postedPosts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            All posted items ({postedPosts.length}) — active &amp; history
          </div>
          {[...postedPosts]
            .sort((a, b) => new Date(b.postedAt || b.date) - new Date(a.postedAt || a.date))
            .map(post => {
              const rev = engagementRevenue(post)
              const spend = postSpend(post)
              const isHistory = post.deleted
              const platformColor = PLATFORM_PALETTE[post.platform] || 'var(--green)'
              const postedDate = post.postedAt
                ? new Date(post.postedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                : post.date
              return (
                <Card key={post._id || post.id} style={{ border: isHistory ? '1px solid var(--border)' : undefined, opacity: isHistory ? 0.85 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {/* Platform avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: platformColor + '22', color: platformColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 13,
                    }}>
                      {(post.platform || 'X').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top row: platform + badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{post.platform}</span>
                        {post.type && <Badge color="var(--text-dim)" style={{ fontSize: 10 }}>{post.type}</Badge>}
                        {post.postMethod && <Badge color="var(--text-dim)" style={{ fontSize: 10 }}>{post.postMethod}</Badge>}
                        <Badge color="var(--green)">posted</Badge>
                        {post.autoPosted && <Badge color="var(--accent)">auto</Badge>}
                        {isHistory && <Badge color="var(--text-dim)">history</Badge>}
                      </div>
                      {/* Date */}
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>🕐 {postedDate}</div>
                      {/* Text */}
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{post.text}</div>
                      {/* External post ID */}
                      {post.externalPostId && !post.externalPostId.startsWith('simulated_') && (
                        <div style={{ fontSize: 12, color: platformColor, marginBottom: 4 }}>
                          {post.platform} post ID: {post.externalPostId}
                        </div>
                      )}
                      {/* Media URL */}
                      {post.mediaUrl && (
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
                          Media: <a href={post.mediaUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{post.mediaUrl}</a>
                        </div>
                      )}
                      {/* Engagement + revenue */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          👁 {post.views || 0} · ❤️ {post.likes || 0} · 🔁 {post.shares || 0} · 💬 {post.comments || 0}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Revenue: Rs {rev}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Spend: {formatINR(spend)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
