import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterView from '../RegisterView.vue'

const mockRegister = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ register: mockRegister }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

async function fillAndSubmit(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('input#givenname').setValue('Max')
  await wrapper.find('input#surname').setValue('Muster')
  await wrapper.find('input#email').setValue('max.muster@example.com')
  await wrapper.find('input#phone').setValue('+43 660 1234567')
  await wrapper.find('input#password').setValue('Passw0rd1')
  await wrapper.find('input#password_confirmation').setValue('Passw0rd1')
  await wrapper.find('form').trigger('submit.prevent')
}

describe('RegisterView', () => {
  it('renders the card structure with all fields', () => {
    const wrapper = mount(RegisterView)

    expect(wrapper.text()).toContain('Erst-Registrierung')
    for (const id of [
      'givenname',
      'surname',
      'email',
      'phone',
      'password',
      'password_confirmation',
    ]) {
      expect(wrapper.find(`#${id}`).exists()).toBe(true)
    }
  })

  it('lets password managers propose a new password for both password fields', () => {
    const wrapper = mount(RegisterView)

    expect(wrapper.find('input#password').attributes('autocomplete')).toBe('new-password')
    expect(wrapper.find('input#password_confirmation').attributes('autocomplete')).toBe(
      'new-password',
    )
  })

  it('gives browsers the autofill hints for the personal fields', () => {
    const wrapper = mount(RegisterView)

    expect(wrapper.find('input#givenname').attributes('autocomplete')).toBe('given-name')
    expect(wrapper.find('input#surname').attributes('autocomplete')).toBe('family-name')
    expect(wrapper.find('input#email').attributes('autocomplete')).toBe('username')
    expect(wrapper.find('input#phone').attributes('autocomplete')).toBe('tel')
  })

  it('registers and replaces the form with the notice of the backend', async () => {
    mockRegister.mockResolvedValueOnce('Bitte prüfe dein Postfach.')
    const wrapper = mount(RegisterView)

    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain('Bitte prüfe dein Postfach.'))

    expect(mockRegister).toHaveBeenCalledWith({
      givenname: 'Max',
      surname: 'Muster',
      email: 'max.muster@example.com',
      phone: '+43 660 1234567',
      password: 'Passw0rd1',
      password_confirmation: 'Passw0rd1',
    })
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').text()).toBe('Bitte prüfe dein Postfach.')
  })

  it('shows per-field errors of a 422 and keeps the form', async () => {
    mockRegister.mockRejectedValueOnce({
      response: {
        data: {
          detail: [
            {
              loc: ['body', 'phone'],
              msg: 'Ungültige Telefonnummer',
              type: 'value_error',
            },
          ],
        },
      },
    })
    const wrapper = mount(RegisterView)

    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain('Ungültige Telefonnummer'))

    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('shows the password policy error returned by the backend', async () => {
    mockRegister.mockRejectedValueOnce({
      response: {
        data: {
          detail: [
            {
              loc: ['body', 'password'],
              msg: 'Das Passwort muss zwischen 10 und 64 Zeichen lang sein.',
              type: 'value_error',
            },
          ],
        },
      },
    })
    const wrapper = mount(RegisterView)

    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain('zwischen 10 und 64 Zeichen'))
  })
})
