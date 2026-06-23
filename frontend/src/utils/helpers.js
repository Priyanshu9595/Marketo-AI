// ₹ value of each social engagement signal — mirrors backend config/aiCosts.js.
export const ENGAGEMENT_VALUES = { views: 0.5, likes: 2, shares: 5, comments: 3 }

// Cost charged when a post of this content type is posted — mirrors backend.
export const POST_TYPE_COST = { 'Text message': 0.26, 'Image': 3.68, 'Video': 75.46 }
export const postSpend = (p = {}) => Math.round((POST_TYPE_COST[p.type] || 0) * 100) / 100

// Paid-API cost per AI generation (INR) — mirrors backend config/aiCosts.js.
export const AI_COSTS = { copy: 0.26, image: 3.68, video: 75.46 }

// Revenue a post earns from its engagement counts.
const rate = (value = 0) => value > 1 ? value / 100 : value

export const engagementRevenue = (p = {}) => {
  if (p.platform === 'YouTube' && p.type === 'Video' && p.rpm > 0) {
    return Math.round(((p.views || 0) / 1000) * p.rpm)
  }

  if (p.type === 'Image' && p.impressions > 0 && p.averageOrderValue > 0) {
    return Math.round(
      p.impressions *
      rate(p.clickRate || 0) *
      rate(p.conversionRate || 0) *
      p.averageOrderValue
    )
  }

  return Math.round(
    (p.views    || 0) * ENGAGEMENT_VALUES.views +
    (p.likes    || 0) * ENGAGEMENT_VALUES.likes +
    (p.shares   || 0) * ENGAGEMENT_VALUES.shares +
    (p.comments || 0) * ENGAGEMENT_VALUES.comments
  )
}

export const formatINR = (amount) => {
  const n = Math.round(amount * 100) / 100
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`
  if (n % 1 !== 0) return `₹${n.toFixed(2)}`
  return `₹${n}`
}

export const calcROAS = (revenue, spend) => {
  if (!spend) return '0.00'
  return (revenue / spend).toFixed(2)
}

export const calcCAC = (spend, clicks, convRate = 0.03) => {
  const conversions = clicks * convRate
  if (!conversions) return '0'
  return Math.round(spend / conversions).toString()
}

// Today's date as a local 'YYYY-MM-DD' string (matches <input type="date"> values)
export const todayISO = () => {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export const nowLocalDateTime = () => {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export const dateTimeValue = (date, time, fallbackTime) =>
  date ? `${date}T${time || fallbackTime}` : ''

export const getCampaignDateTimeStatus = (start, end, startTime = '', endTime = '') => {
  const now = nowLocalDateTime()
  const startAt = dateTimeValue(start, startTime, '00:00')
  const endAt = dateTimeValue(end, endTime, '23:59')
  if (startAt && now < startAt) return 'scheduled'
  if (endAt && now > endAt) return 'paused'
  return 'active'
}

// Derive a campaign's status from its start/end dates relative to today
export const getCampaignStatus = (start, end) => {
  const today = todayISO()
  if (start && today < start) return 'scheduled' // hasn't begun yet
  if (end && today > end)     return 'paused'    // finished → auto-paused
  return 'active'                                // running now
}

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// List of month indexes (0–11) a date range spans, inclusive
export const monthsInRange = (start, end) => {
  const s = new Date(start), e = new Date(end)
  if (isNaN(s) || isNaN(e) || e < s) return []
  const months = []
  const cur = new Date(s.getFullYear(), s.getMonth(), 1)
  const last = new Date(e.getFullYear(), e.getMonth(), 1)
  while (cur <= last) {
    months.push(cur.getMonth())
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

export const monthsInDateRange = (start, end) => {
  const s = new Date(start), e = new Date(end)
  if (isNaN(s) || isNaN(e) || e < s) return []
  const months = []
  const cur = new Date(s.getFullYear(), s.getMonth(), 1)
  const last = new Date(e.getFullYear(), e.getMonth(), 1)
  while (cur <= last) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() })
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

export const campaignYears = (campaigns) => {
  const years = new Set([new Date().getFullYear()])
  campaigns.forEach(c => {
    if (c.start && c.end) {
      monthsInDateRange(c.start, c.end).forEach(({ year }) => years.add(year))
      return
    }
    const d = c.start ? new Date(c.start) : new Date()
    if (!isNaN(d)) years.add(d.getFullYear())
  })
  const sorted = Array.from(years).sort((a, b) => a - b)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  return Array.from({ length: last - first + 1 }, (_, i) => first + i)
}

export const monthlyRevenueForYear = (campaigns, year) => {
  const totals = Array(12).fill(0)
  campaigns.forEach(c => {
    if (c.start && c.end) {
      const months = monthsInDateRange(c.start, c.end)
      if (months.length) {
        const share = c.revenue / months.length
        months.forEach(({ year: y, month }) => {
          if (y === year) totals[month] += share
        })
        return
      }
    }
    const d = c.start ? new Date(c.start) : new Date()
    if (!isNaN(d) && d.getFullYear() === year) totals[d.getMonth()] += c.revenue
  })
  return MONTH_LABELS.map((label, month) => ({ label, value: Math.round(totals[month]) }))
}

// Build 12 monthly revenue buckets from a list of campaigns
export const monthlyRevenue = (campaigns) => {
  const totals = Array(12).fill(0)
  campaigns.forEach(c => {
    if (c.start && c.end) {
      const months = monthsInRange(c.start, c.end)
      if (months.length) {
        const share = c.revenue / months.length
        months.forEach(m => { totals[m] += share })
        return
      }
    }
    // No valid date range: attribute to the start month, else current month
    const m = c.start ? new Date(c.start).getMonth() : new Date().getMonth()
    totals[m] += c.revenue
  })
  return MONTH_LABELS.map((label, m) => ({ label, value: Math.round(totals[m]) }))
}

export const getDaysInMonth = (year, month) =>
  new Date(year, month + 1, 0).getDate()

export const getFirstDayOfMonth = (year, month) =>
  new Date(year, month, 1).getDay()

export const truncate = (str, max = 60) =>
  str.length > max ? str.slice(0, max) + '…' : str

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const streamText = (text, setter, speed = 12) => {
  return new Promise((resolve) => {
    let i = 0
    const iv = setInterval(() => {
      setter(text.slice(0, i))
      i += 3
      if (i > text.length) {
        setter(text)
        clearInterval(iv)
        resolve()
      }
    }, speed)
  })
}
