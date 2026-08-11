import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterView from '../RegisterView.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

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
  it('renders the Legacy card structure with all fields', () => {
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

  it('registers and redirects home on success', async () => {
    mockRegister.mockResolvedValueOnce(undefined)
    const wrapper = mount(RegisterView)

    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())

    expect(mockRegister).toHaveBeenCalledWith({
      givenname: 'Max',
      surname: 'Muster',
      email: 'max.muster@example.com',
      phone: '+43 660 1234567',
      password: 'Passw0rd1',
      password_confirmation: 'Passw0rd1',
    })
    expect(mockPush).toHaveBeenCalledWith({ name: 'home' })
  })

  it('shows per-field conflict errors on a 422', async () => {
    mockRegister.mockRejectedValueOnce({
      response: {
        data: {
          detail: [
            {
              loc: ['body', 'givenname'],
              msg: 'Die Kombination von Vor- und Nachname ist vergeben.',
              type: 'value_error',
            },
            {
              loc: ['body', 'surname'],
              msg: 'Die Kombination von Vor- und Nachname ist vergeben.',
              type: 'value_error',
            },
          ],
        },
      },
    })
    const wrapper = mount(RegisterView)

    await fillAndSubmit(wrapper)
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Die Kombination von Vor- und Nachname ist vergeben.'),
    )

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows the password policy error returned by the backend', async () => {
    mockRegister.mockRejectedValueOnce({
      response: {
        data: {
          detail: [
            {
              loc: ['body', 'password'],
              msg: 'Das neue Passwort entspricht nicht den Richtlinien (8-16 Zeichen, mind. eine Ziffer, mind. ein Buchstabe. Muss sich vom bestehenden Passwort unterscheiden.).',
              type: 'value_error',
            },
          ],
        },
      },
    })
    const wrapper = mount(RegisterView)

    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain('entspricht nicht den Richtlinien'))
  })
})
