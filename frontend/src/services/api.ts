/**
 * src/services/api.ts
 * Axios instance with base URL, interceptors, and typed helper methods.
 */
import axios, { type AxiosError } from 'axios'
import type { ApiError } from '../types/index'
import { useAuthStore } from '../store/authStore'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ── Request interceptor ──────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  // Read token from zustand persisted storage
  const storageStr = localStorage.getItem('ai-screen-auth')
  if (storageStr) {
    try {
      const { state } = JSON.parse(storageStr)
      if (state.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    } catch (e) {
      // ignore parse errors
    }
  }
  return config
})

// ── Response interceptor (normalise errors) ────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    const detail = error.response?.data?.detail
    let message: string
    if (Array.isArray(detail)) {
      // FastAPI validation errors: [{loc, msg, type}, ...]
      message = detail
        .map((d: any) => {
          const field = Array.isArray(d.loc) ? d.loc.join(' → ') : ''
          return field ? `${field}: ${d.msg}` : d.msg
        })
        .join('\n')
    } else if (typeof detail === 'string') {
      message = detail
    } else {
      message = error.message ?? 'An unexpected error occurred'
    }
    return Promise.reject(new Error(message))
  },
)

export default apiClient
