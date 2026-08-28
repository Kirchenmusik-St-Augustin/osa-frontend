import api from '@/services/api'
import type { User } from '@/composables/useUsers'

export interface ProfileUpdatePayload {
  givenname: string
  surname: string
  email: string
  phone: string
  change_password: boolean
  password: string | null
  password_confirmation: string | null
  auth_password: string
}

// UI-independent API layer for Schritt 7's Selfadmin-Profil. Reuses the
// User type from useUsers.ts -- GET /profile returns the exact same shape
// (backend reuses user_service.get_user() 1:1, see
// app/api/router_includes/profile.py).
export function useProfile() {
  async function get(): Promise<User> {
    const response = await api.get<User>('/profile')
    return response.data
  }

  async function update(payload: ProfileUpdatePayload): Promise<User> {
    const response = await api.put<User>('/profile', payload)
    return response.data
  }

  // Existing endpoint from Schritt 1/2 (Google-Login linking), IDOR-fixed
  // there already -- was never actually called from the frontend until now.
  async function disconnectOauth2(bindingId: number): Promise<void> {
    await api.delete(`/auth/oauth2/${bindingId}`)
  }

  return { get, update, disconnectOauth2 }
}
