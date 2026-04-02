import apiClient from './api'
import { useAuthStore } from '../store/authStore'

export interface LoginResponse {
  access_token: string
  token_type: string
  user: {
    id: string
    name: string
    email: string
    created_at: string
  }
}

export interface RegisterResponse extends LoginResponse {}

export const authService = {
  async register(name: string, email: string, password: string): Promise<void> {
    const { data } = await apiClient.post<RegisterResponse>('/auth/register', { name, email, password })
    // Backend returns token + user on register too
    useAuthStore.getState().setCredentials(data.access_token, {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
    })
  },

  async login(email: string, password: string): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('username', email)  // OAuth2 expects username field
    formData.append('password', password)

    const { data } = await apiClient.post<LoginResponse>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    
    // Extract real user attributes from backend TokenResponse
    useAuthStore.getState().setCredentials(data.access_token, {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
    })
  },

  logout() {
    useAuthStore.getState().logout()
  }
}
