import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, useTemplateRef } from 'vue'
import { mount } from '@vue/test-utils'
import { useGoogleSignIn } from '../useGoogleSignIn'

let mockClientId: string | undefined = 'test-client-id'
vi.mock('@/runtimeConfig', () => ({
  googleClientId: () => mockClientId,
}))

function makeTestHost(onCredential: (credential: string) => void) {
  return defineComponent({
    setup() {
      const container = useTemplateRef<HTMLDivElement>('container')
      useGoogleSignIn(container, onCredential)
      return () => h('div', { ref: 'container' })
    },
  })
}

beforeEach(() => {
  mockClientId = 'test-client-id'
  vi.unstubAllGlobals()
  document.head.innerHTML = ''
})

describe('useGoogleSignIn', () => {
  it('does nothing when no client ID is configured', async () => {
    mockClientId = undefined
    mount(makeTestHost(vi.fn()))
    await Promise.resolve()

    expect(document.head.querySelector('script')).toBeNull()
  })

  it('injects the GSI script when Google Identity Services is not yet loaded', async () => {
    mount(makeTestHost(vi.fn()))
    await Promise.resolve()

    const script = document.head.querySelector('script')
    expect(script?.src).toBe('https://accounts.google.com/gsi/client')
  })

  it('initializes and renders the button when Google Identity Services is already present', async () => {
    const initialize = vi.fn()
    const renderButton = vi.fn()
    vi.stubGlobal('google', { accounts: { id: { initialize, renderButton } } })

    mount(makeTestHost(vi.fn()))
    await Promise.resolve()
    await Promise.resolve()

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id' }),
    )
    expect(renderButton).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ theme: 'outline', size: 'large' }),
    )
  })

  it('forwards the credential to the provided callback', async () => {
    const onCredential = vi.fn()
    let capturedCallback: ((response: { credential: string }) => void) | undefined
    const initialize = vi.fn((config: { callback: (response: { credential: string }) => void }) => {
      capturedCallback = config.callback
    })
    vi.stubGlobal('google', { accounts: { id: { initialize, renderButton: vi.fn() } } })

    mount(makeTestHost(onCredential))
    await Promise.resolve()
    await Promise.resolve()

    capturedCallback?.({ credential: 'the-credential' })

    expect(onCredential).toHaveBeenCalledWith('the-credential')
  })
})
