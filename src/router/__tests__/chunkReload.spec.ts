import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import { isChunkLoadError, registerChunkReload } from '../chunkReload'

function makeRouterStub(): { router: Router; triggerError: (error: unknown) => void } {
  let errorHandler: ((error: unknown, to: { fullPath: string }) => void) | undefined
  const router = {
    afterEach: vi.fn(),
    onError: vi.fn((handler: (error: unknown, to: { fullPath: string }) => void) => {
      errorHandler = handler
    }),
  } as unknown as Router

  return {
    router,
    triggerError: (error: unknown) => errorHandler?.(error, { fullPath: '/repertoire/scores' }),
  }
}

describe('isChunkLoadError', () => {
  it('recognizes the Chromium wording', () => {
    expect(isChunkLoadError('Failed to fetch dynamically imported module: /x.js')).toBe(true)
  })

  it('recognizes the Firefox wording', () => {
    expect(isChunkLoadError('error loading dynamically imported module: /x.js')).toBe(true)
  })

  it('recognizes the Safari wording', () => {
    expect(isChunkLoadError('Importing a module script failed.')).toBe(true)
  })

  it('recognizes a stale CSS chunk', () => {
    expect(isChunkLoadError('Unable to preload CSS for /assets/x.css')).toBe(true)
  })

  it('does not misfire on an unrelated error', () => {
    expect(isChunkLoadError('Network Error')).toBe(false)
  })
})

describe('registerChunkReload', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.stubGlobal('location', { href: 'https://example.test/current' })
  })

  it('reloads to the target route on a chunk load error', () => {
    const { router, triggerError } = makeRouterStub()
    registerChunkReload(router)

    triggerError(new Error('Failed to fetch dynamically imported module: /x.js'))

    expect(window.location.href).toBe('/repertoire/scores')
    expect(window.sessionStorage.getItem('chunk-reload-attempted')).toBe('1')
  })

  it('does not reload for an unrelated error', () => {
    const { router, triggerError } = makeRouterStub()
    registerChunkReload(router)

    triggerError(new Error('boom'))

    expect(window.location.href).toBe('https://example.test/current')
  })

  it('reloads only once per session, even across repeated failures', () => {
    const { router, triggerError } = makeRouterStub()
    registerChunkReload(router)

    triggerError(new Error('Failed to fetch dynamically imported module: /x.js'))
    window.location.href = 'https://example.test/current'
    triggerError(new Error('Failed to fetch dynamically imported module: /y.js'))

    expect(window.location.href).toBe('https://example.test/current')
  })

  it('clears the guard on the next successful navigation', () => {
    const { router } = makeRouterStub()
    registerChunkReload(router)
    window.sessionStorage.setItem('chunk-reload-attempted', '1')

    const afterEachHandler = vi.mocked(router.afterEach).mock.calls[0]?.[0]
    afterEachHandler?.(
      // @ts-expect-error -- only the reset side effect is under test, the
      // handler itself never reads its arguments.
      undefined,
      undefined,
      () => {},
    )

    expect(window.sessionStorage.getItem('chunk-reload-attempted')).toBeNull()
  })
})
