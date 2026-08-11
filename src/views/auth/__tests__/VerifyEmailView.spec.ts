import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import VerifyEmailView from '../VerifyEmailView.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
const mockRoute = { query: {} as Record<string, string> }
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
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

  it('shows the backend error message on an invalid/expired token', async () => {
    mockRoute.query = { token: 'bad-token' }
    mockVerifyEmail.mockRejectedValueOnce({
      response: { data: { detail: 'Der Bestätigungslink ist ungültig oder abgelaufen.' } },
    })
    const wrapper = mount(VerifyEmailView)
    await flushPromises()

    expect(wrapper.text()).toContain('Der Bestätigungslink ist ungültig oder abgelaufen.')
  })
})
