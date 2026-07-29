import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginView from '../LoginView.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
const mockRoute = { query: {} as Record<string, string> }
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
  useRoute: () => mockRoute,
}))

const mockLogin = vi.fn()
const mockLoginWithGoogleCredential = vi.fn()
const mockLinkGoogleAccount = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    login: mockLogin,
    loginWithGoogleCredential: mockLoginWithGoogleCredential,
    linkGoogleAccount: mockLinkGoogleAccount,
  }),
}))

let capturedGoogleCallback: ((credential: string) => Promise<void>) | undefined
vi.mock('@/composables/useGoogleSignIn', () => ({
  useGoogleSignIn: vi.fn((_container: unknown, onCredential: (credential: string) => void) => {
    capturedGoogleCallback = onCredential as (credential: string) => Promise<void>
  }),
}))

let mockGoogleClientId: string | undefined = 'test-client-id.apps.googleusercontent.com'
vi.mock('@/runtimeConfig', () => ({
  googleClientId: () => mockGoogleClientId,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockRoute.query = {}
  mockGoogleClientId = 'test-client-id.apps.googleusercontent.com'
  capturedGoogleCallback = undefined
})

describe('LoginView', () => {
  it('renders the Legacy card structure', () => {
    const wrapper = mount(LoginView)

    expect(wrapper.text()).toContain('Anmeldung.')
    expect(wrapper.find('input#email').exists()).toBe(true)
    expect(wrapper.find('input#password').exists()).toBe(true)
    expect(wrapper.text()).toContain('Erst-Registrierung')
    expect(wrapper.text()).toContain('Passwort-Rücksetzung')
  })

  it('does not render the Google button area without a configured client ID', () => {
    mockGoogleClientId = undefined
    const wrapper = mount(LoginView)

    expect(wrapper.find('#google-signin-button-wrapper').exists()).toBe(false)
  })

  it('logs in and redirects home on success', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    const wrapper = mount(LoginView)

    await wrapper.find('input#email').setValue('a@example.test')
    await wrapper.find('input#password').setValue('secret')
    await wrapper.find('form').trigger('submit.prevent')
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())

    expect(mockLogin).toHaveBeenCalledWith('a@example.test', 'secret')
    expect(mockPush).toHaveBeenCalledWith({ name: 'home' })
  })

  it('redirects to a safe same-app path from the query string', async () => {
    mockRoute.query = { redirect: '/some-protected-page' }
    mockLogin.mockResolvedValueOnce(undefined)
    const wrapper = mount(LoginView)

    await wrapper.find('input#email').setValue('a@example.test')
    await wrapper.find('input#password').setValue('secret')
    await wrapper.find('form').trigger('submit.prevent')
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())

    expect(mockPush).toHaveBeenCalledWith('/some-protected-page')
  })

  it.each(['//evil.example.com/phish', 'https://evil.example.com/phish'])(
    'falls back to home instead of following an open-redirect target (%s)',
    async (unsafeTarget) => {
      mockRoute.query = { redirect: unsafeTarget }
      mockLogin.mockResolvedValueOnce(undefined)
      const wrapper = mount(LoginView)

      await wrapper.find('input#email').setValue('a@example.test')
      await wrapper.find('input#password').setValue('secret')
      await wrapper.find('form').trigger('submit.prevent')
      await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())

      expect(mockPush).toHaveBeenCalledWith({ name: 'home' })
    },
  )

  it('shows the generic login error message under the email field', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { data: { detail: 'Anmeldedaten unbekannt.' } },
    })
    const wrapper = mount(LoginView)

    await wrapper.find('input#email').setValue('a@example.test')
    await wrapper.find('input#password').setValue('wrong')
    await wrapper.find('form').trigger('submit.prevent')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Anmeldedaten unbekannt.'))

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows the link-account form when Google reports ACCOUNT_NOT_LINKED (404)', async () => {
    mockLoginWithGoogleCredential.mockRejectedValueOnce({
      response: { status: 404, data: { detail: 'ACCOUNT_NOT_LINKED' } },
    })
    mount(LoginView)

    await capturedGoogleCallback?.('google-credential-token')

    expect(mockLoginWithGoogleCredential).toHaveBeenCalledWith('google-credential-token')
  })

  it('logs in via Google and redirects home on success', async () => {
    mockLoginWithGoogleCredential.mockResolvedValueOnce(undefined)
    mount(LoginView)

    await capturedGoogleCallback?.('google-credential-token')
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())

    expect(mockPush).toHaveBeenCalledWith({ name: 'home' })
  })

  it('links the Google account with local credentials and redirects home', async () => {
    mockLoginWithGoogleCredential.mockRejectedValueOnce({
      response: { status: 404, data: { detail: 'ACCOUNT_NOT_LINKED' } },
    })
    mockLinkGoogleAccount.mockResolvedValueOnce(undefined)
    const wrapper = mount(LoginView)

    await capturedGoogleCallback?.('google-credential-token')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Authentisierung zur Konten-Verknüpfung')

    await wrapper.find('input#link-email').setValue('a@example.test')
    await wrapper.find('input#link-password').setValue('secret')
    await wrapper.findAll('form')[1]?.trigger('submit.prevent')
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())

    expect(mockLinkGoogleAccount).toHaveBeenCalledWith(
      'google-credential-token',
      'a@example.test',
      'secret',
    )
    expect(mockPush).toHaveBeenCalledWith({ name: 'home' })
  })
})
