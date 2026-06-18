export const formatINR = (amount) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}k`
  return `₹${amount}`
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