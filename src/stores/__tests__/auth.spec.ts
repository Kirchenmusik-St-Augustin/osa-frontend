import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../auth'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockedApi = vi.mocked(api)

const profile = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  email: 'a@example.test',
  surname: 'MUSTER',
  givenname: 'Max',
  administrator: false,
  permissions: ['performanceChangeUserStatus'],
  ...overrides,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useAuthStore', () => {
  it('starts unauthenticated', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
  })

  it('login sends form-encoded credentials, sets the token, and fetches the profile', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'token-123', token_type: 'bearer' },
    })
    mockedApi.get.mockResolvedValueOnce({ data: profile() })

    const store = useAuthStore()
    await store.login('a@example.test', 'secret')

    expect(store.isAuthenticated).toBe(true)
    expect(store.accessToken).toBe('token-123')
    expect(store.user?.surname).toBe('MUSTER')
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/auth/login',
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    )
  })

  it('login propagates errors to the caller instead of swallowing them', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('401'))
    const store = useAuthStore()

    await expect(store.login('a@example.test', 'wrong')).rejects.toThrow('401')
    expect(store.isAuthenticated).toBe(false)
  })

  it('hasPermission reflects the fetched profile', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { access_token: 't', token_type: 'bearer' } })
    mockedApi.get.mockResolvedValueOnce({
      data: profile({ administrator: true, permissions: ['userMaintain'] }),
    })
    const store = useAuthStore()
    await store.login('a@example.test', 'secret')

    expect(store.hasPermission('userMaintain')).toBe(true)
    expect(store.hasPermission('roleMaintain')).toBe(false)
  })

  it('hasPermission is false when logged out', () => {
    expect(useAuthStore().hasPermission('userMaintain')).toBe(false)
  })

  it('logout clears auth state even if the API call itself fails', async () => {
    const store = useAuthStore()
    store.$patch({ accessToken: 'token', user: profile() })
    mockedApi.post.mockRejectedValueOnce(new Error('network error'))

    await expect(store.logout()).rejects.toThrow('network error')

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
  })

  it('restoreSession clears auth silently when no session exists', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('401'))
    const store = useAuthStore()

    await store.restoreSession()

    expect(store.isAuthenticated).toBe(false)
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('restoreSession restores the token and profile when a session exists', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'restored-token', token_type: 'bearer' },
    })
    mockedApi.get.mockResolvedValueOnce({ data: profile({ id: 2 }) })
    const store = useAuthStore()

    await store.restoreSession()

    expect(store.isAuthenticated).toBe(true)
    expect(store.accessToken).toBe('restored-token')
  })

  it('restoreSession only ever calls refresh once, even if invoked repeatedly', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'restored-token', token_type: 'bearer' },
    })
    mockedApi.get.mockResolvedValueOnce({ data: profile({ id: 2 }) })
    const store = useAuthStore()

    await store.restoreSession()
    await store.restoreSession()
    await store.restoreSession()

    expect(mockedApi.post).toHaveBeenCalledTimes(1)
  })

  it('refreshToken updates the access token without re-fetching the profile', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'new-token', token_type: 'bearer' },
    })
    const store = useAuthStore()
    store.$patch({ user: profile() })

    const token = await store.refreshToken()

    expect(token).toBe('new-token')
    expect(store.accessToken).toBe('new-token')
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('register sends the payload, sets the token, and fetches the profile', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { access_token: 'token', token_type: 'bearer' } })
    mockedApi.get.mockResolvedValueOnce({ data: profile({ id: 3 }) })
    const store = useAuthStore()

    await store.register({
      surname: 'c',
      givenname: 'z',
      email: 'c@example.test',
      phone: '+43 660 1234567',
      password: 'Passw0rd1',
      password_confirmation: 'Passw0rd1',
    })

    expect(store.isAuthenticated).toBe(true)
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({ email: 'c@example.test' }),
    )
  })

  it('verifyEmail sends the token, sets the access token, and fetches the profile', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { access_token: 'token', token_type: 'bearer' } })
    mockedApi.get.mockResolvedValueOnce({ data: profile({ id: 4 }) })
    const store = useAuthStore()

    await store.verifyEmail('some-token')

    expect(store.isAuthenticated).toBe(true)
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/verify-email', { token: 'some-token' })
  })

  it('loginWithGoogleCredential sends the credential, sets the token, and fetches the profile', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { access_token: 'token', token_type: 'bearer' } })
    mockedApi.get.mockResolvedValueOnce({ data: profile({ id: 5 }) })
    const store = useAuthStore()

    await store.loginWithGoogleCredential('google-credential')

    expect(store.isAuthenticated).toBe(true)
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/google/callback', {
      credential: 'google-credential',
    })
  })

  it('linkGoogleAccount sends credential+local creds, sets the token, and fetches the profile', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { access_token: 'token', token_type: 'bearer' } })
    mockedApi.get.mockResolvedValueOnce({ data: profile({ id: 6 }) })
    const store = useAuthStore()

    await store.linkGoogleAccount('google-credential', 'f@example.test', 'secret')

    expect(store.isAuthenticated).toBe(true)
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/google/link', {
      credential: 'google-credential',
      email: 'f@example.test',
      password: 'secret',
    })
  })
})
