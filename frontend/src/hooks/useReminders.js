import { useEffect, useRef } from 'react'
import { API_BASE } from '../utils/api'

const CHECK_INTERVAL_MS = 10000
const SCHEDULE_TIME_ZONE_OFFSET = '+05:30'

function showReminder(onReminder, detail) {
  if (onReminder) {
    onReminder(detail)
  } else {
    window.dispatchEvent(new CustomEvent('marketo-reminder-popup', { detail }))
  }
}

// Pull scheduled posts from MongoDB and show an in-app popup one hour before.
// Browser notifications are used too, but only when Chrome allows them.
export function useReminders(onReminder) {
  const reminded = useRef(new Set())

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      let posts = []
      try {
        const res = await fetch(`${API_BASE}/social`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        posts = await res.json()
      } catch {
        return
      }
      if (cancelled || !Array.isArray(posts)) return

      const now = Date.now()
      posts.forEach(p => {
        if (p.posted) return
        const postTime = new Date(`${p.date}T${p.time || '00:00:00'}${SCHEDULE_TIME_ZONE_OFFSET}`).getTime()
        if (isNaN(postTime)) return

        const remindAt = postTime - 60 * 60 * 1000
        const key = String(p.id)

        if (now >= remindAt && now < postTime && !reminded.current.has(key)) {
          const message = `You have left 1 hour to share content on ${p.platform}.`
          showReminder(onReminder, {
            title: 'Reminder',
            message,
            platform: p.platform,
            type: p.type,
            text: p.text,
          })

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Reminder', { body: message })
          }

          reminded.current.add(key)
        }
      })
    }

    const checkNow = () => check()

    check()
    window.addEventListener('marketo-check-reminders', checkNow)
    const iv = setInterval(check, CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      window.removeEventListener('marketo-check-reminders', checkNow)
      clearInterval(iv)
    }
  }, [onReminder])
}
