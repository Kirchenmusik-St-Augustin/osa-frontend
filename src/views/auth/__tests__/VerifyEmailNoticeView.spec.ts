import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VerifyEmailNoticeView from '../VerifyEmailNoticeView.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockResendVerificationEmail = vi.fn()
const mockLogout = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    resendVerificationEmail: mockResendVerificationEmail,
    logout: mockLogout,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('VerifyEmailNoticeView', () => {
  it('shows the resend button and hint text, not the success text, initially', () => {
    const wrapper = mount(VerifyEmailNoticeView)

    expect(wrapper.text()).toContain(
      'Die E-Mail-Adresse des Benutzerkontos ist derzeit nicht verifiziert.',
    )
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Die Überprüfungs-E-Mail wurde erneut versandt!')
  })

  it('resends the verification email and shows the success text on submit', async () => {
    mockResendVerificationEmail.mockResolvedValueOnce(undefined)
    const wrapper = mount(VerifyEmailNoticeView)

    await wrapper.find('form').trigger('submit')

    expect(mockResendVerificationEmail).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Die Überprüfungs-E-Mail wurde erneut versandt!')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('logs out and navigates to login when "Log out" is clicked', async () => {
    mockLogout.mockResolvedValueOnce(undefined)
    const wrapper = mount(VerifyEmailNoticeView)

    await wrapper.find('.card-footer a').trigger('click')

    expect(mockLogout).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
  })
})
