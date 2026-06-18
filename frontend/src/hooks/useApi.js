import { useState, useCallback } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || err.message || res.statusText || 'Request failed')
      }
      return await res.json()
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const get    = (url)         => request(url, { method: 'GET' })
  const post   = (url, body)   => request(url, { method: 'POST',   body })
  const put    = (url, body)   => request(url, { method: 'PUT',    body })
  const del    = (url)         => request(url, { method: 'DELETE' })

  return { get, post, put, del, loading, error }
}