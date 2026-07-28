import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiBaseUrl, appEnvironment } from '@/runtimeConfig'

// Explicitly stub/unstub every VITE_* var this module reads instead of
// relying on it being absent from the ambient environment -- the dev
// container sets these for `npm run dev` convenience, and tests must not
// implicitly depend on that (see feedback_dev_workflow: test hermeticity).
afterEach(() => {
  delete window.__APP_CONFIG__
  vi.unstubAllEnvs()
})

describe('runtimeConfig', () => {
  it('apiBaseUrl defaults to the same-origin relative path /api', () => {
    vi.stubEnv('VITE_API_BASE_URL', undefined)
    expect(apiBaseUrl()).toBe('/api')
  })

  it('apiBaseUrl prefers window.__APP_CONFIG__ over the default', () => {
    window.__APP_CONFIG__ = { API_BASE_URL: 'https://example.test/api' }
    expect(apiBaseUrl()).toBe('https://example.test/api')
  })

  it('appEnvironment reads from window.__APP_CONFIG__ when present', () => {
    window.__APP_CONFIG__ = { APP_ENVIRONMENT: 'production' }
    expect(appEnvironment()).toBe('production')
  })

  it('appEnvironment is undefined when nothing is configured', () => {
    vi.stubEnv('VITE_APP_ENVIRONMENT', undefined)
    expect(appEnvironment()).toBeUndefined()
  })
})
