import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
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

  it('shows an error and keeps the form usable when the resend request fails', async () => {
    mockResendVerificationEmail.mockRejectedValueOnce(new Error('Too Many Requests'))
    const wrapper = mount(VerifyEmailNoticeView)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Beim erneuten Versand ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.',
    )
    expect(wrapper.text()).not.toContain('Die Überprüfungs-E-Mail wurde erneut versandt!')
    const button = wrapper.find('button[type="submit"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('disables the resend button while the request is in flight', async () => {
    let resolveResend: () => void = () => {}
    mockResendVerificationEmail.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveResend = resolve
      }),
    )
    const wrapper = mount(VerifyEmailNoticeView)

    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    resolveResend()
    await flushPromises()
    expect(wrapper.text()).toContain('Die Überprüfungs-E-Mail wurde erneut versandt!')
  })

  it('clears the previous error as soon as a retry starts and shows the success text once it succeeds', async () => {
    let resolveRetry: () => void = () => {}
    mockResendVerificationEmail
      .mockRejectedValueOnce(new Error('Too Many Requests'))
      .mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveRetry = resolve
        }),
      )
    const wrapper = mount(VerifyEmailNoticeView)

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Beim erneuten Versand ist ein Fehler aufgetreten.')

    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).not.toContain('Beim erneuten Versand ist ein Fehler aufgetreten.')

    resolveRetry()
    await flushPromises()
    expect(wrapper.text()).toContain('Die Überprüfungs-E-Mail wurde erneut versandt!')
  })

  it('logs out and navigates to login when "Log out" is clicked', async () => {
    mockLogout.mockResolvedValueOnce(undefined)
    const wrapper = mount(VerifyEmailNoticeView)

    await wrapper.find('.card-footer a').trigger('click')

    expect(mockLogout).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
  })
})
