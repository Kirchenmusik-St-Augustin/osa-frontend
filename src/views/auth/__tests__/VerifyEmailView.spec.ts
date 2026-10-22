import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import VerifyEmailView from '../VerifyEmailView.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
const mockReplace = vi.fn().mockResolvedValue(undefined)
const mockRoute = { query: {} as Record<string, string> }
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => mockRoute,
}))

const mockVerifyEmail = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ verifyEmail: mockVerifyEmail }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockRoute.query = {}
})

describe('VerifyEmailView', () => {
  it('shows an error immediately when no token is present in the URL', async () => {
    const wrapper = mount(VerifyEmailView)
    await flushPromises()

    expect(wrapper.text()).toContain('Der Bestätigungslink ist ungültig oder abgelaufen.')
    expect(mockVerifyEmail).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('shows the success message and a continue button on a valid token', async () => {
    mockRoute.query = { token: 'verify-token-abc' }
    mockVerifyEmail.mockResolvedValueOnce(undefined)
    const wrapper = mount(VerifyEmailView)
    await flushPromises()

    expect(mockVerifyEmail).toHaveBeenCalledWith('verify-token-abc')
    expect(wrapper.text()).toContain('Die E-Mail-Adresse wurde erfolgreich bestätigt.')

    await wrapper.find('button').trigger('click')
    expect(mockPush).toHaveBeenCalledWith({ name: 'home' })
  })

  it('removes the token from the address bar before it is verified', async () => {
    mockRoute.query = { token: 'verify-token-abc' }
    mockVerifyEmail.mockResolvedValueOnce(undefined)
    mount(VerifyEmailView)
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({ name: 'verify-email' })
    expect(mockVerifyEmail).toHaveBeenCalledWith('verify-token-abc')
    expect(mockReplace.mock.invocationCallOrder[0]).toBeLessThan(
      mockVerifyEmail.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('shows the backend error message on an invalid/expired token', async () => {
    mockRoute.query = { token: 'bad-token' }
    mockVerifyEmail.mockRejectedValueOnce({
      response: { data: { detail: 'Der Bestätigungslink ist ungültig oder abgelaufen.' } },
    })
    const wrapper = mount(VerifyEmailView)
    await flushPromises()

    expect(wrapper.text()).toContain('Der Bestätigungslink ist ungültig oder abgelaufen.')
  })

  it('shows the used-link message with a hint and a button to the login', async () => {
    mockRoute.query = { token: 'used-token' }
    mockVerifyEmail.mockRejectedValueOnce({
      response: { data: { detail: 'Der Bestätigungslink wurde bereits verwendet.' } },
    })
    const wrapper = mount(VerifyEmailView)
    await flushPromises()

    expect(wrapper.text()).toContain('Der Bestätigungslink wurde bereits verwendet.')
    expect(wrapper.text()).toContain('ist eine direkte Anmeldung möglich')

    await wrapper.find('button').trigger('click')
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('offers the login button in the error state only', async () => {
    mockRoute.query = { token: 'verify-token-abc' }
    mockVerifyEmail.mockResolvedValueOnce(undefined)
    const wrapper = mount(VerifyEmailView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Zur Anmeldung')
  })
})
