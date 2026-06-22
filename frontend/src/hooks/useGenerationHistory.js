import { useState, useCallback } from 'react'

// Per-tool generation history, persisted in localStorage so it survives reloads.
// Each entry: { id, at, kind: 'text'|'image'|'video', title, cost, url?, preview? }
export function useGenerationHistory(toolKey, max = 12) {
  const storageKey = `marketo_history_${toolKey}`

  const [history, setHistory] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })

  const write = (next) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* quota / disabled */ }
  }

  const add = useCallback((entry) => {
    setHistory(prev => {
      const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: Date.now(),
        ...entry,
      }
      const next = [item, ...prev].slice(0, max)
      write(next)
      return next
    })
  }, [storageKey, max])

  const clear = useCallback(() => {
    setHistory([])
    write([])
  }, [storageKey])

  return { history, add, clear }
}
