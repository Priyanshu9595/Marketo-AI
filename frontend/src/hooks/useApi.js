import { useState, useCallback } from 'react'
import { apiFetch } from '../utils/api'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true)
    setError(null)
    try {
      return await apiFetch(endpoint, options)
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
