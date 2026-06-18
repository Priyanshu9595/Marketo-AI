import { useEffect, useRef } from 'react'

const POSTS_KEY    = 'marketo_posts'
const REMINDED_KEY = 'marketo_reminded'
const ENABLED_KEY  = 'reminders_enabled'

// Background reminder checker. Runs app-wide while the tab is open and fires a
// browser notification when "now" falls within the hour before a scheduled post.
export function useReminders() {
  const reminded = useRef(new Set(
    JSON.parse(localStorage.getItem(REMINDED_KEY) || '[]')
  ))

  useEffect(() => {
    const check = () => {
      if (localStorage.getItem(ENABLED_KEY) !== 'true') return
      if (!('Notification' in window) || Notification.permission !== 'granted') return

      let posts = []
      try { posts = JSON.parse(localStorage.getItem(POSTS_KEY) || '[]') } catch { return }
      if (!Array.isArray(posts)) return

      const now = Date.now()
      posts.forEach(p => {
        if (p.posted) return
        const postTime = new Date(`${p.date}T${p.time || '00:00:00'}`).getTime()
        if (isNaN(postTime)) return

        const remindAt = postTime - 60 * 60 * 1000 // 1 hour before
        const key = String(p.id)

        // Inside the [1h-before, post-time) window and not yet reminded
        if (now >= remindAt && now < postTime && !reminded.current.has(key)) {
          new Notification('Upcoming post in ~1 hour ⏰', {
            body: `${p.platform} · ${p.type}\n${p.text}`,
          })
          reminded.current.add(key)
          localStorage.setItem(REMINDED_KEY, JSON.stringify([...reminded.current]))
        }
      })
    }

    check()                              // run immediately on load
    const iv = setInterval(check, 30000) // then every 30 seconds
    return () => clearInterval(iv)
  }, [])
}
