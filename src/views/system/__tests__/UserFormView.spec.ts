import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UserFormView from '../UserFormView.vue'
import type { User, UserFormOptions } from '@/composables/useUsers'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockGet = vi.fn()
const mockGetFormOptions = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/composables/useUsers', () => ({
  useUsers: () => ({
    get: mockGet,
    getFormOptions: mockGetFormOptions,
    create: mockCreate,
    update: mockUpdate,
  }),
}))

let mockIsAdministrator = false
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { administrator: mockIsAdministrator } }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

const emptyOptions: UserFormOptions = { instruments: [], voices: [], choirjobs: [], roles: [] }

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    surname: 'SCHINDLER',
    givenname: 'Margot',
    email: null,
    email_verified_at: null,
    phone: null,
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
  mockIsAdministrator = false
  mockGetFormOptions.mockResolvedValue(emptyOptions)
})

describe('UserFormView', () => {
  it('starts empty and creates a new user on save', async () => {
    mockCreate.mockResolvedValueOnce(makeUser({ id: 9 }))
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    expect(mockGet).not.toHaveBeenCalled()
    await wrapper.find('input#user-givenname').setValue('Margot')
    await wrapper.find('input#user-surname').setValue('Schindler')
    await wrapper.find('input#user-phone').setValue('0664 1234567')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockCreate).toHaveBeenCalledWith({
      givenname: 'Margot',
      surname: 'Schindler',
      email: null,
      phone: '0664 1234567',
      auth_locked: false,
      instruments: [],
      voices: [],
      choirjobs: [],
      roles: [],
      administrator: false,
    })
    expect(mockShowToast).toHaveBeenCalledWith('gespeichert.')
    expect(mockPush).toHaveBeenCalledWith({ name: 'system-users-show', params: { id: 9 } })
  })

  it('shows the "Pflichtfeld" hint while email is empty', async () => {
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    expect(wrapper.text()).toContain('Pflichtfeld')
  })

  it('shows "E-mail nicht verifiziert" once a value is typed without a saved verification', async () => {
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    await wrapper.find('input#user-email').setValue('margot@example.com')

    expect(wrapper.text()).toContain('E-mail nicht verifiziert')
  })

  it('pre-fills the form and shows the verified-at hint when editing an untouched email', async () => {
    mockGet.mockResolvedValueOnce(
      makeUser({
        id: 5,
        email: 'margot@example.com',
        email_verified_at: '2023-12-28T16:50:00+00:00',
      }),
    )
    const wrapper = mount(UserFormView, { props: { id: '5' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(5)
    expect((wrapper.find('input#user-surname').element as HTMLInputElement).value).toBe('SCHINDLER')
    expect(wrapper.text()).toContain('E-Mail verifiziert:')
  })

  it('switches to "nicht verifiziert" once the pre-filled email is edited', async () => {
    mockGet.mockResolvedValueOnce(
      makeUser({
        id: 5,
        email: 'margot@example.com',
        email_verified_at: '2023-12-28T16:50:00+00:00',
      }),
    )
    const wrapper = mount(UserFormView, { props: { id: '5' } })
    await flushPromises()

    await wrapper.find('input#user-email').setValue('other@example.com')

    expect(wrapper.text()).not.toContain('E-Mail verifiziert:')
    expect(wrapper.text()).toContain('E-mail nicht verifiziert')
  })

  it('shows both the name and the "Benutzerkonto erstellen" subtitle when editing (1:1 Legacy quirk)', async () => {
    mockGet.mockResolvedValueOnce(makeUser({ id: 5 }))
    const wrapper = mount(UserFormView, { props: { id: '5' } })
    await flushPromises()

    expect(wrapper.text()).toContain('SCHINDLER, Margot')
    expect(wrapper.text()).toContain('Benutzerkonto erstellen')
  })

  it('hides the Rollen picker for a non-administrator', async () => {
    mockIsAdministrator = false
    mockGetFormOptions.mockResolvedValueOnce({
      instruments: [],
      voices: [],
      choirjobs: [],
      roles: [{ id: 1, name: 'disponent', label: 'Disponent' }],
    })
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Rollen')
  })

  it('shows the Rollen picker for an administrator', async () => {
    mockIsAdministrator = true
    mockGetFormOptions.mockResolvedValueOnce({
      instruments: [],
      voices: [],
      choirjobs: [],
      roles: [{ id: 1, name: 'disponent', label: 'Disponent' }],
    })
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    expect(wrapper.text()).toContain('Rollen')
  })

  it('hides the Administrator checkbox for a non-administrator', async () => {
    mockIsAdministrator = false
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    expect(wrapper.find('input#user-administrator').exists()).toBe(false)
  })

  it('shows the Administrator checkbox for an administrator and includes it in the save payload', async () => {
    mockIsAdministrator = true
    mockCreate.mockResolvedValueOnce(makeUser({ id: 9 }))
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    const checkbox = wrapper.find('input#user-administrator')
    expect(checkbox.exists()).toBe(true)
    await checkbox.setValue(true)
    await wrapper.find('input#user-givenname').setValue('Margot')
    await wrapper.find('input#user-surname').setValue('Schindler')
    await wrapper.find('input#user-phone').setValue('0664 1234567')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ administrator: true }))
  })

  it('pre-fills the Administrator checkbox when editing an existing administrator-eligible user', async () => {
    mockIsAdministrator = true
    mockGet.mockResolvedValueOnce(makeUser({ id: 5, administrator: true }))
    const wrapper = mount(UserFormView, { props: { id: '5' } })
    await flushPromises()

    expect((wrapper.find('input#user-administrator').element as HTMLInputElement).checked).toBe(
      true,
    )
  })

  it('does not save when the user cancels the confirmation', async () => {
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('shows field-level validation errors under the matching input', async () => {
    mockCreate.mockRejectedValueOnce({
      response: {
        data: {
          detail: [
            {
              loc: ['body', 'surname'],
              msg: 'Die Kombination von Vor- und Nachname ist vergeben.',
            },
          ],
        },
      },
    })
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Die Kombination von Vor- und Nachname ist vergeben.')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
