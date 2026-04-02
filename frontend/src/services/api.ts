/**
 * src/services/api.ts
 * Axios instance with base URL, interceptors, and typed helper methods.
 */
import axios, { type AxiosError } from 'axios'
import type { ApiError } from '../types/index'

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
    const message =
      error.response?.data?.detail ?? error.message ?? 'An unexpected error occurred'
    return Promise.reject(new Error(message))
  },
)

export default apiClient
