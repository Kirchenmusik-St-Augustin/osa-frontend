import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export interface EmailKillSwitchStatus {
  active: boolean
  period_days: number
  threshold: number
}

export interface AuthUser {
  id: number
  email: string
  email_verified_at: string | null
  surname: string
  givenname: string
  administrator: boolean
  permissions: string[]
  email_kill_switch: EmailKillSwitchStatus
}

export interface RegisterPayload {
  surname: string
  givenname: string
  email: string
  phone: string
  password: string
  password_confirmation: string
}

interface TokenResponse {
  access_token: string
  token_type: string
}

// Access token lives in memory only (this store), never localStorage --
// the httponly refresh-token cookie is what survives a page reload; see
// restoreSession(), called once at app boot (router/guards.ts).
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)

  const isAuthenticated = computed(() => accessToken.value !== null)

  function hasPermission(permission: string): boolean {
    return user.value?.permissions.includes(permission) ?? false
  }

  function clearAuth(): void {
    accessToken.value = null
    user.value = null
  }

  async function fetchProfile(): Promise<void> {
    const response = await api.get<AuthUser>('/auth/me')
    user.value = response.data
  }

  // Token-only refresh, used both by restoreSession() below and by the
  // response interceptor (services/api.ts) on a 401 -- deliberately does
  // NOT re-fetch the profile on every silent refresh (the user's own data
  // doesn't change just because the access token rotated).
  async function refreshToken(): Promise<string> {
    const response = await api.post<TokenResponse>('/auth/refresh')
    accessToken.value = response.data.access_token
    return response.data.access_token
  }

  async function login(email: string, password: string): Promise<void> {
    const body = new URLSearchParams({ username: email, password })
    const response = await api.post<TokenResponse>('/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    accessToken.value = response.data.access_token
    await fetchProfile()
  }

  async function loginWithGoogleCredential(credential: string): Promise<void> {
    const response = await api.post<TokenResponse>('/auth/google/callback', { credential })
    accessToken.value = response.data.access_token
    await fetchProfile()
  }

  async function linkGoogleAccount(
    credential: string,
    email: string,
    password: string,
  ): Promise<void> {
    const response = await api.post<TokenResponse>('/auth/google/link', {
      credential,
      email,
      password,
    })
    accessToken.value = response.data.access_token
    await fetchProfile()
  }

  async function register(payload: RegisterPayload): Promise<void> {
    const response = await api.post<TokenResponse>('/auth/register', payload)
    accessToken.value = response.data.access_token
    await fetchProfile()
  }

  async function verifyEmail(token: string): Promise<void> {
    const response = await api.post<TokenResponse>('/auth/verify-email', { token })
    accessToken.value = response.data.access_token
    await fetchProfile()
  }

  async function resendVerificationEmail(): Promise<void> {
    await api.post('/auth/resend-verification-email')
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } finally {
      clearAuth()
    }
  }

  // Best-effort session restore on app boot: no refresh_token cookie yet
  // (never logged in) and an expired one both just leave the user logged
  // out -- neither is an error worth surfacing. Idempotent (guarded by
  // sessionRestoreAttempted) so router/guards.ts can call this
  // unconditionally on every navigation without re-triggering the actual
  // network round-trip after the first one.
  const sessionRestoreAttempted = ref(false)

  async function restoreSession(): Promise<void> {
    if (sessionRestoreAttempted.value) return
    sessionRestoreAttempted.value = true
    try {
      await refreshToken()
      await fetchProfile()
    } catch {
      clearAuth()
    }
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    hasPermission,
    clearAuth,
    fetchProfile,
    refreshToken,
    login,
    loginWithGoogleCredential,
    linkGoogleAccount,
    register,
    verifyEmail,
    resendVerificationEmail,
    logout,
    restoreSession,
  }
})
