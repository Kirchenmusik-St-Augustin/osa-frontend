import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ForgotPasswordView from '../ForgotPasswordView.vue'

const mockForgotPassword = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ forgotPassword: mockForgotPassword }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ForgotPasswordView', () => {
  it('renders the Legacy card structure', () => {
    const wrapper = mount(ForgotPasswordView)

    expect(wrapper.text()).toContain('Anmeldung')
    expect(wrapper.text()).toContain(
      'Im Falle eines vergessenen Passwortes kann hier unter Angabe der registrierten E-Mail-Adresse ein neues Passwort gesetzt werden.',
    )
    expect(wrapper.find('input#email').exists()).toBe(true)
  })

  it('shows the neutral confirmation message after submitting, regardless of the outcome', async () => {
    mockForgotPassword.mockResolvedValueOnce(undefined)
    const wrapper = mount(ForgotPasswordView)

    await wrapper.find('input#email').setValue('nobody@example.com')
    await wrapper.find('form').trigger('submit.prevent')
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain(
        'Sollte die angegebene Adresse registriert sein, wird eine E-Mail mit einem Rücksetzungs-Link versandt.',
      ),
    )

    expect(mockForgotPassword).toHaveBeenCalledWith('nobody@example.com')
    // The form itself disappears once the neutral confirmation is shown.
    expect(wrapper.find('input#email').exists()).toBe(false)
  })

  it('shows a field error on malformed input instead of the confirmation', async () => {
    mockForgotPassword.mockRejectedValueOnce({
      response: {
        data: {
          detail: [
            { loc: ['body', 'email'], msg: 'Ungültige E-Mail-Adresse.', type: 'value_error' },
          ],
        },
      },
    })
    const wrapper = mount(ForgotPasswordView)

    await wrapper.find('input#email').setValue('not-an-email')
    await wrapper.find('form').trigger('submit.prevent')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Ungültige E-Mail-Adresse.'))

    expect(wrapper.find('input#email').exists()).toBe(true)
  })
})
