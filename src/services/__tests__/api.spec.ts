import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'

const { mockPush, mockCurrentRoute } = vi.hoisted(() => ({
  mockPush: vi.fn().mockResolvedValue(undefined),
  mockCurrentRoute: {
    value: { name: 'home' as string | undefined, fullPath: '/' },
  },
}))
vi.mock('@/router', () => ({
  default: {
    currentRoute: mockCurrentRoute,
    push: mockPush,
  },
}))

import api from '../api'
import { useAuthStore } from '@/stores/auth'
import { useLoadingStore } from '@/stores/loading'

function makeResponse(config: InternalAxiosRequestConfig, data: unknown = {}): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

function makeError(config: InternalAxiosRequestConfig, status: number, data: unknown = {}) {
  const error = new Error(`Request failed with status ${status}`) as Error & {
    config: InternalAxiosRequestConfig
    response: { status: number; data: unknown; config: InternalAxiosRequestConfig }
    isAxiosError: boolean
  }
  error.config = config
  error.response = { status, data, config }
  error.isAxiosError = true
  return error
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockPush.mockClear()
  mockCurrentRoute.value = { name: 'home', fullPath: '/' }
})

describe('api client', () => {
  it('is configured with the default same-origin base URL', async () => {
    // Isolated from the module-level `api` import above on purpose: this
    // dev container sets a real VITE_API_BASE_URL (pointing at the live
    // Caddy domain) so `npm run dev` works against it, which would
    // otherwise leak into this test since api.ts reads
    // import.meta.env.VITE_API_BASE_URL once at module-evaluation time.
    // Stub it back to unset + force a fresh module evaluation to test the
    // documented same-origin default in isolation.
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.resetModules()
    const { default: freshApi } = await import('../api')

    expect(freshApi.defaults.baseURL).toBe('/api')

    vi.unstubAllEnvs()
  })

  it('sends credentials so same-origin auth cookies are included', () => {
    expect(api.defaults.withCredentials).toBe(true)
  })
})

describe('api (axios interceptors)', () => {
  it('adds the Authorization header when a token is present', async () => {
    const authStore = useAuthStore()
    authStore.$patch({ accessToken: 'test-token' })
    let capturedConfig: InternalAxiosRequestConfig | undefined
    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      capturedConfig = config
      return makeResponse(config)
    })

    await api.get('/ping')

    expect(capturedConfig?.headers.Authorization).toBe('Bearer test-token')
  })

  it('does not add an Authorization header without a token', async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined
    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      capturedConfig = config
      return makeResponse(config)
    })

    await api.get('/ping')

    expect(capturedConfig?.headers.Authorization).toBeUndefined()
  })

  it('refreshes the token and retries the original request on a 401', async () => {
    const authStore = useAuthStore()
    authStore.$patch({ accessToken: 'expired-token' })
    let protectedCalls = 0

    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/protected') {
        protectedCalls++
        if (protectedCalls === 1) throw makeError(config, 401, { detail: 'expired' })
        return makeResponse(config, { ok: true })
      }
      if (config.url === '/auth/refresh') {
        return makeResponse(config, { access_token: 'new-token' })
      }
      throw new Error(`unexpected url ${String(config.url)}`)
    })

    const response = await api.get('/protected')

    expect(response.data).toEqual({ ok: true })
    expect(authStore.accessToken).toBe('new-token')
    expect(protectedCalls).toBe(2)
  })

  it('clears auth and redirects to login when the refresh call itself fails', async () => {
    const authStore = useAuthStore()
    authStore.$patch({ accessToken: 'expired-token' })

    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/protected') throw makeError(config, 401, { detail: 'expired' })
      if (config.url === '/auth/refresh') throw makeError(config, 401, { detail: 'no session' })
      throw new Error(`unexpected url ${String(config.url)}`)
    })

    await expect(api.get('/protected')).rejects.toBeTruthy()

    expect(authStore.accessToken).toBeNull()
    expect(mockPush).toHaveBeenCalledWith({ name: 'login', query: { redirect: '/' } })
  })

  it('does not redirect again when already on the login page', async () => {
    mockCurrentRoute.value = { name: 'login', fullPath: '/login' }
    const authStore = useAuthStore()
    authStore.$patch({ accessToken: 'expired-token' })

    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw makeError(config, 401, { detail: 'no session' })
    })

    await expect(api.post('/auth/refresh')).rejects.toBeTruthy()

    expect(mockPush).not.toHaveBeenCalled()
  })

  it.each([
    '/auth/login',
    '/auth/refresh',
    '/auth/register',
    '/auth/verify-email',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/google/callback',
    '/auth/google/link',
  ])('does not attempt a refresh for a 401 on %s', async (url) => {
    const authStore = useAuthStore()
    authStore.$patch({ accessToken: 'some-token' })
    const calledUrls: (string | undefined)[] = []

    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      calledUrls.push(config.url)
      throw makeError(config, 401, { detail: 'invalid credentials' })
    })

    await expect(api.post(url)).rejects.toBeTruthy()

    // Exactly one call -- the original request itself, no refresh retry.
    expect(calledUrls).toEqual([url])
    // The exempt endpoint's own token is left untouched -- a bad-password
    // 401 at /auth/login must not silently log an already-logged-in user
    // out elsewhere in the app.
    expect(authStore.accessToken).toBe('some-token')
  })

  it('does not retry a request that already failed once after a refresh', async () => {
    const authStore = useAuthStore()
    authStore.$patch({ accessToken: 'expired-token' })
    let refreshCalls = 0

    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/refresh') {
        refreshCalls++
        return makeResponse(config, { access_token: 'new-token' })
      }
      throw makeError(config, 401, { detail: 'still expired' })
    })

    await expect(api.get('/protected')).rejects.toBeTruthy()

    expect(refreshCalls).toBe(1)
  })

  it('queues a concurrent request while a refresh is in progress and resolves it with the new token', async () => {
    const authStore = useAuthStore()
    authStore.$patch({ accessToken: 'expired-token' })

    let refreshResolve: () => void = () => {}
    const refreshGate = new Promise<void>((resolve) => {
      refreshResolve = resolve
    })

    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/refresh') {
        await refreshGate
        return makeResponse(config, { access_token: 'new-token' })
      }
      if (config.url?.startsWith('/protected')) {
        const isStale = config.headers.Authorization !== 'Bearer new-token'
        if (isStale) throw makeError(config, 401, { detail: 'expired' })
        return makeResponse(config, { url: config.url })
      }
      throw new Error(`unexpected url ${String(config.url)}`)
    })

    const requestA = api.get('/protected/a')
    const requestB = api.get('/protected/b')

    // Let both initial 401s resolve and the refresh call start before completing it.
    await Promise.resolve()
    await Promise.resolve()
    refreshResolve()

    const [resA, resB] = await Promise.all([requestA, requestB])

    expect(resA.data).toEqual({ url: '/protected/a' })
    expect(resB.data).toEqual({ url: '/protected/b' })
    expect(authStore.accessToken).toBe('new-token')
  })
})

describe('api (global loading bar)', () => {
  it('starts and stops the loading indicator around a successful request', async () => {
    const loadingStore = useLoadingStore()
    const startSpy = vi.spyOn(loadingStore, 'startLoading')
    const stopSpy = vi.spyOn(loadingStore, 'stopLoading')
    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => makeResponse(config))

    await api.get('/ping')

    expect(startSpy).toHaveBeenCalledOnce()
    expect(stopSpy).toHaveBeenCalledOnce()
  })

  it('stops the loading indicator even when a request fails', async () => {
    const loadingStore = useLoadingStore()
    const stopSpy = vi.spyOn(loadingStore, 'stopLoading')
    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw makeError(config, 500, { detail: 'boom' })
    })

    await expect(api.get('/broken')).rejects.toBeTruthy()

    expect(stopSpy).toHaveBeenCalledOnce()
  })

  it('stops the loading indicator before attempting a 401 refresh retry, not after', async () => {
    const authStore = useAuthStore()
    authStore.$patch({ accessToken: 'expired-token' })
    const loadingStore = useLoadingStore()
    const callOrder: string[] = []
    vi.spyOn(loadingStore, 'stopLoading').mockImplementation(() => {
      callOrder.push('stopLoading')
    })

    let protectedCalls = 0
    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/refresh') {
        callOrder.push('refresh-request')
        return makeResponse(config, { access_token: 'new-token' })
      }
      if (config.url === '/protected') {
        protectedCalls++
        if (protectedCalls === 1) throw makeError(config, 401, { detail: 'expired' })
        return makeResponse(config, { ok: true })
      }
      throw new Error(`unexpected url ${String(config.url)}`)
    })

    await api.get('/protected')

    expect(callOrder[0]).toBe('stopLoading')
    expect(callOrder).toContain('refresh-request')
  })
})
