export const API_BASE = (import.meta.env.VITE_API_URL || 'https://marketo-ai-backend.onrender.com/api').replace(/\/$/, '')

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new CustomEvent('marketo-auth-expired', {
        detail: { message: data?.error || data?.message || 'Your session expired. Please log in again.' },
      }))
    }
    throw new Error(data?.error || data?.message || res.statusText || 'Request failed')
  }

  return data
}
