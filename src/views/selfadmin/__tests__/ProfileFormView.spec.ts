import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ProfileFormView from '../ProfileFormView.vue'
import type { User } from '@/composables/useUsers'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockGet = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/composables/useProfile', () => ({
  useProfile: () => ({ get: mockGet, update: mockUpdate }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    surname: 'SCHINDLER',
    givenname: 'Margot',
    email: 'margot@example.com',
    email_verified_at: null,
    phone: '0664 9182108',
    auth_lastsignal: null,
    auth_locked: false,
    administrator: false,
    deletable: true,
    oauth2_bindings: [],
    instruments: [],
    voices: [],
    choirjobs: [],
    roles: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConfirmAction.mockResolvedValue(true)
  mockGet.mockResolvedValue(makeUser())
})

describe('ProfileFormView', () => {
  it('pre-fills the form with the current profile data', async () => {
    const wrapper = mount(ProfileFormView)
    await flushPromises()

    expect(mockGet).toHaveBeenCalled()
    expect((wrapper.find('input#profile-surname').element as HTMLInputElement).value).toBe(
      'SCHINDLER',
    )
    expect((wrapper.find('input#profile-email').element as HTMLInputElement).value).toBe(
      'margot@example.com',
    )
  })

  it('hides the new-password fields until "Passwort setzen" is toggled', async () => {
    const wrapper = mount(ProfileFormView)
    await flushPromises()

    expect(wrapper.find('input#profile-password').exists()).toBe(false)

    await wrapper.find('input#profile-change-password').setValue(true)

    expect(wrapper.find('input#profile-password').exists()).toBe(true)
    expect(wrapper.find('input#profile-password-confirmation').exists()).toBe(true)
  })

  it('always shows the required "aktuelles Passwort" field', async () => {
    const wrapper = mount(ProfileFormView)
    await flushPromises()

    expect(wrapper.find('input#profile-auth-password').exists()).toBe(true)
    expect(wrapper.text()).toContain(
      'Um Änderungen der persönlichen Daten zu speichern, muss das aktuelle Passwort eingegeben werden.',
    )
  })

  it('saves with null password fields when not changing the password', async () => {
    mockUpdate.mockResolvedValueOnce(makeUser())
    const wrapper = mount(ProfileFormView)
    await flushPromises()

    await wrapper.find('input#profile-auth-password').setValue('current-pw')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith({
      givenname: 'Margot',
      surname: 'SCHINDLER',
      email: 'margot@example.com',
      phone: '0664 9182108',
      change_password: false,
      password: null,
      password_confirmation: null,
      auth_password: 'current-pw',
    })
    expect(mockShowToast).toHaveBeenCalledWith('gespeichert.')
    expect(mockPush).toHaveBeenCalledWith({ name: 'selfadmin-profile-show' })
  })

  it('saves the new password when changing it', async () => {
    mockUpdate.mockResolvedValueOnce(makeUser())
    const wrapper = mount(ProfileFormView)
    await flushPromises()

    await wrapper.find('input#profile-change-password').setValue(true)
    await wrapper.find('input#profile-password').setValue('NeuesPassw0rt')
    await wrapper.find('input#profile-password-confirmation').setValue('NeuesPassw0rt')
    await wrapper.find('input#profile-auth-password').setValue('current-pw')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        change_password: true,
        password: 'NeuesPassw0rt',
        password_confirmation: 'NeuesPassw0rt',
      }),
    )
  })

  it('does not save when the user cancels the confirmation', async () => {
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(ProfileFormView)
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('shows field-level validation errors under the matching input', async () => {
    mockUpdate.mockRejectedValueOnce({
      response: {
        data: {
          detail: [{ loc: ['body', 'auth_password'], msg: 'Das bestehende Passwort ist falsch.' }],
        },
      },
    })
    const wrapper = mount(ProfileFormView)
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Das bestehende Passwort ist falsch.')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
