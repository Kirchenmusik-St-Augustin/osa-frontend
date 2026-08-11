import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'
import { runAuthGuards } from '../guards'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const mockedApi = vi.mocked(api)

function makeRoute(overrides: Partial<RouteLocationNormalized> = {}): RouteLocationNormalized {
  return {
    fullPath: '/',
    path: '/',
    name: undefined,
    params: {},
    query: {},
    hash: '',
    matched: [],
    meta: {},
    redirectedFrom: undefined,
    ...overrides,
  } as RouteLocationNormalized
}

const authenticatedProfile = {
  id: 1,
  email: 'a@example.test',
  email_verified_at: '2024-01-01T00:00:00Z',
  surname: 'MUSTER',
  givenname: 'Max',
  administrator: false,
  permissions: [],
  email_kill_switch: { active: false, period_days: 30, threshold: 950 },
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  // Default: no active refresh_token cookie -- restoreSession() ends up
  // logged out unless a test explicitly makes it succeed below.
  mockedApi.post.mockRejectedValue(new Error('no session'))
})

describe('runAuthGuards', () => {
  it('allows a public route through when logged out', async () => {
    const result = await runAuthGuards(makeRoute({ meta: {} }), makeRoute(), vi.fn())
    expect(result).toBe(true)
  })

  it('redirects to login for a requiresAuth route when logged out', async () => {
    const to = makeRoute({ fullPath: '/some-protected-page', meta: { requiresAuth: true } })

    const result = await runAuthGuards(to, makeRoute(), vi.fn())

    expect(result).toEqual({ name: 'login', query: { redirect: '/some-protected-page' } })
  })

  it('allows a requiresAuth route through once a session is restored', async () => {
    mockedApi.post.mockReset()
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'restored', token_type: 'bearer' },
    })
    mockedApi.get.mockResolvedValueOnce({ data: authenticatedProfile })
    const to = makeRoute({ meta: { requiresAuth: true } })

    const result = await runAuthGuards(to, makeRoute(), vi.fn())

    expect(result).toBe(true)
  })

  it('redirects an already-authenticated user away from a requiresGuest route', async () => {
    mockedApi.post.mockReset()
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'restored', token_type: 'bearer' },
    })
    mockedApi.get.mockResolvedValueOnce({ data: authenticatedProfile })
    const to = makeRoute({ meta: { requiresGuest: true } })

    const result = await runAuthGuards(to, makeRoute(), vi.fn())

    expect(result).toEqual({ name: 'home' })
  })

  it('allows a requiresGuest route through when logged out', async () => {
    const to = makeRoute({ meta: { requiresGuest: true } })

    const result = await runAuthGuards(to, makeRoute(), vi.fn())

    expect(result).toBe(true)
  })

  it('allows a route with neither meta flag through regardless of auth state', async () => {
    const to = makeRoute({ meta: {} })

    const result = await runAuthGuards(to, makeRoute(), vi.fn())

    expect(result).toBe(true)
  })

  it("redirects home when the user lacks the route's requiredPermission", async () => {
    mockedApi.post.mockReset()
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'restored', token_type: 'bearer' },
    })
    mockedApi.get.mockResolvedValueOnce({ data: authenticatedProfile })
    const to = makeRoute({ meta: { requiredPermission: 'artistMaintain' } })

    const result = await runAuthGuards(to, makeRoute(), vi.fn())

    expect(result).toEqual({ name: 'home' })
  })

  it('allows the route through once the user has the required permission', async () => {
    mockedApi.post.mockReset()
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'restored', token_type: 'bearer' },
    })
    mockedApi.get.mockResolvedValueOnce({
      data: { ...authenticatedProfile, permissions: ['artistMaintain'] },
    })
    const to = makeRoute({ meta: { requiredPermission: 'artistMaintain' } })

    const result = await runAuthGuards(to, makeRoute(), vi.fn())

    expect(result).toBe(true)
  })

  it('redirects an unverified logged-in user to verify-email-notice', async () => {
    mockedApi.post.mockReset()
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'restored', token_type: 'bearer' },
    })
    mockedApi.get.mockResolvedValueOnce({
      data: { ...authenticatedProfile, email_verified_at: null },
    })
    const to = makeRoute({ meta: { requiresAuth: true } })

    const result = await runAuthGuards(to, makeRoute(), vi.fn())

    expect(result).toEqual({ name: 'verify-email-notice' })
  })

  it('lets an unverified logged-in user reach verify-email-notice itself', async () => {
    mockedApi.post.mockReset()
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'restored', token_type: 'bearer' },
    })
    mockedApi.get.mockResolvedValueOnce({
      data: { ...authenticatedProfile, email_verified_at: null },
    })
    const to = makeRoute({ name: 'verify-email-notice', meta: { requiresAuth: true } })

    const result = await runAuthGuards(to, makeRoute(), vi.fn())

    expect(result).toBe(true)
  })

  it('lets an unverified logged-in user reach the token-consuming verify-email page', async () => {
    mockedApi.post.mockReset()
    mockedApi.post.mockResolvedValueOnce({
      data: { access_token: 'restored', token_type: 'bearer' },
    })
    mockedApi.get.mockResolvedValueOnce({
      data: { ...authenticatedProfile, email_verified_at: null },
    })
    const to = makeRoute({ name: 'verify-email', meta: {} })

    const result = await runAuthGuards(to, makeRoute(), vi.fn())

    expect(result).toBe(true)
  })
})
