import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'

// Per-tool generation history, persisted by the backend in MongoDB.
// Each entry: { id, at, kind: 'text'|'image'|'video', title, cost, url?, preview? }
export function useGenerationHistory(toolKey, max = 12) {
  const [history, setHistory] = useState([])
  const queryKind = toolKey === 'text' ? 'copy' : toolKey

  useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem('token')
    if (!token) {
      setHistory([])
      return
    }

    apiFetch(`/ai/usage?kind=${encodeURIComponent(queryKind)}&limit=${max}`)
      .then(data => {
        if (!cancelled) setHistory(Array.isArray(data.generations) ? data.generations : [])
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })

    return () => { cancelled = true }
  }, [queryKind, max])

  const add = useCallback((entry) => {
    setHistory(prev => {
      const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: Date.now(),
        ...entry,
      }
      const next = [item, ...prev].slice(0, max)
      return next
    })
  }, [max])

  const clear = useCallback(async () => {
    setHistory([])
    try {
      await apiFetch(`/ai/usage?kind=${encodeURIComponent(queryKind)}`, { method: 'DELETE' })
    } catch {
      // Keep the UI responsive even if an old backend is still deployed.
    }
  }, [queryKind])

  return { history, add, clear }
}
