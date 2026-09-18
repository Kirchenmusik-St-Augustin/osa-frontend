import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResetPasswordView from '../ResetPasswordView.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
const mockRoute = { query: {} as Record<string, string> }
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
  useRoute: () => mockRoute,
}))

const mockResetPassword = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ resetPassword: mockResetPassword }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockRoute.query = { token: 'reset-token-abc', email: 'a@example.com' }
})

describe('ResetPasswordView', () => {
  it('pre-fills email and token from the URL query', () => {
    const wrapper = mount(ResetPasswordView)

    expect((wrapper.find('input#email').element as HTMLInputElement).value).toBe('a@example.com')
  })

  it('lets password managers propose a new password for both password fields', () => {
    const wrapper = mount(ResetPasswordView)

    expect(wrapper.find('input#password').attributes('autocomplete')).toBe('new-password')
    expect(wrapper.find('input#password_confirmation').attributes('autocomplete')).toBe(
      'new-password',
    )
  })

  it('submits the reset and redirects to login on success', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined)
    const wrapper = mount(ResetPasswordView)

    await wrapper.find('input#password').setValue('Passw0rd1')
    await wrapper.find('input#password_confirmation').setValue('Passw0rd1')
    await wrapper.find('form').trigger('submit.prevent')
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())

    expect(mockResetPassword).toHaveBeenCalledWith({
      email: 'a@example.com',
      token: 'reset-token-abc',
      password: 'Passw0rd1',
      password_confirmation: 'Passw0rd1',
    })
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('shows the invalid-token error message under the email field', async () => {
    mockResetPassword.mockRejectedValueOnce({
      response: { data: { detail: 'Der angegebene Token zur Passwort-Rücksetzung ist ungültig.' } },
    })
    const wrapper = mount(ResetPasswordView)

    await wrapper.find('input#password').setValue('Passw0rd1')
    await wrapper.find('input#password_confirmation').setValue('Passw0rd1')
    await wrapper.find('form').trigger('submit.prevent')
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain(
        'Der angegebene Token zur Passwort-Rücksetzung ist ungültig.',
      ),
    )

    expect(mockPush).not.toHaveBeenCalled()
  })
})
