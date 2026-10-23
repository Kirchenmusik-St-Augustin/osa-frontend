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
    id: '1',
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

const saveButton = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('button').find((button) => button.text() === 'speichern')

describe('UserFormView', () => {
  it('starts empty and creates a new user on save', async () => {
    mockCreate.mockResolvedValueOnce(makeUser({ id: '9' }))
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
    expect(mockPush).toHaveBeenCalledWith({ name: 'system-users-show', params: { id: '9' } })
  })

  it('keeps the form hidden and returns to the search when the account cannot be loaded', async () => {
    mockGet.mockRejectedValueOnce({ response: { data: { detail: 'Nicht gefunden.' } } })
    const wrapper = mount(UserFormView, { props: { id: '5' } })
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Nicht gefunden.', true)
    expect(mockPush).toHaveBeenCalledWith({ name: 'system-users-search' })
    expect(wrapper.find('input#user-email').exists()).toBe(false)
  })

  it('uses its own text when the load error carries no message of its own', async () => {
    mockGetFormOptions.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'id'], msg: 'Ungültige Kennung.' }] } },
    })
    mount(UserFormView, { props: {} })
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Das Formular konnte nicht geladen werden.', true)
    expect(mockPush).toHaveBeenCalledWith({ name: 'system-users-search' })
  })

  it('tells the user when saving fails without a field-level reason', async () => {
    mockCreate.mockRejectedValueOnce(new Error('offline'))
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein unerwarteter Fehler ist aufgetreten.', true)
  })

  it('shows the "Benutzerkonto erstellen" subtitle when creating', async () => {
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    expect(wrapper.text()).toContain('Benutzerkonto erstellen')
    expect(wrapper.text()).not.toContain('Benutzerkonto bearbeiten')
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
        id: '5',
        email: 'margot@example.com',
        email_verified_at: '2023-12-28T16:50:00+00:00',
      }),
    )
    const wrapper = mount(UserFormView, { props: { id: '5' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith('5')
    expect((wrapper.find('input#user-surname').element as HTMLInputElement).value).toBe('SCHINDLER')
    expect(wrapper.text()).toContain('E-Mail verifiziert:')
  })

  it('switches to "nicht verifiziert" once the pre-filled email is edited', async () => {
    mockGet.mockResolvedValueOnce(
      makeUser({
        id: '5',
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

  it('shows both the name and the "Benutzerkonto bearbeiten" subtitle when editing', async () => {
    mockGet.mockResolvedValueOnce(makeUser({ id: '5' }))
    const wrapper = mount(UserFormView, { props: { id: '5' } })
    await flushPromises()

    expect(wrapper.text()).toContain('SCHINDLER, Margot')
    expect(wrapper.text()).toContain('Benutzerkonto bearbeiten')
  })

  it('hides the Rollen picker for a non-administrator', async () => {
    mockIsAdministrator = false
    mockGetFormOptions.mockResolvedValueOnce({
      instruments: [],
      voices: [],
      choirjobs: [],
      roles: [{ id: '1', name: 'disponent', label: 'Disponent' }],
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
      roles: [{ id: '1', name: 'disponent', label: 'Disponent' }],
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
    mockCreate.mockResolvedValueOnce(makeUser({ id: '9' }))
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
    mockGet.mockResolvedValueOnce(makeUser({ id: '5', administrator: true }))
    const wrapper = mount(UserFormView, { props: { id: '5' } })
    await flushPromises()

    expect((wrapper.find('input#user-administrator').element as HTMLInputElement).checked).toBe(
      true,
    )
  })

  it('saves the chosen abilities, roles and flags of an edited account as ids', async () => {
    mockIsAdministrator = true
    mockGetFormOptions.mockResolvedValue({
      instruments: [
        { id: 'i1', name: 'Violine' },
        { id: 'i2', name: 'Fagott' },
      ],
      voices: [{ id: 'v1', name: 'Sopran' }],
      choirjobs: [{ id: 'c1', name: 'Solo' }],
      roles: [{ id: 'r1', name: 'disponent', label: 'Disponent' }],
    })
    mockGet.mockResolvedValueOnce(
      makeUser({
        id: '5',
        email: 'margot@example.test',
        phone: '0664 1234567',
        auth_locked: true,
        administrator: true,
        instruments: [{ id: 'i1', name: 'Violine' }],
        voices: [{ id: 'v1', name: 'Sopran' }],
        choirjobs: [{ id: 'c1', name: 'Solo' }],
        roles: [{ id: 'r1', name: 'disponent', label: 'Disponent' }],
      }),
    )
    mockUpdate.mockResolvedValueOnce(makeUser({ id: '5' }))
    const wrapper = mount(UserFormView, { props: { id: '5' } })
    await flushPromises()

    await saveButton(wrapper)?.trigger('click')
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith('5', {
      givenname: 'Margot',
      surname: 'SCHINDLER',
      email: 'margot@example.test',
      phone: '0664 1234567',
      auth_locked: true,
      instruments: ['i1'],
      voices: ['v1'],
      choirjobs: ['c1'],
      roles: ['r1'],
      administrator: true,
    })
    expect(mockPush).toHaveBeenCalledWith({ name: 'system-users-show', params: { id: '5' } })
  })

  it('adds an ability picked in a selection to the saved ids', async () => {
    mockIsAdministrator = true
    mockGetFormOptions.mockResolvedValue({
      instruments: [{ id: 'i1', name: 'Violine' }],
      voices: [{ id: 'v1', name: 'Sopran' }],
      choirjobs: [{ id: 'c1', name: 'Solo' }],
      roles: [{ id: 'r1', name: 'disponent', label: 'Disponent' }],
    })
    mockCreate.mockResolvedValueOnce(makeUser({ id: '9' }))
    const wrapper = mount(UserFormView, { props: {} })
    await flushPromises()

    await wrapper.find('input#user-givenname').setValue('Margot')
    await wrapper.find('input#user-surname').setValue('Schindler')
    await wrapper.find('input#user-phone').setValue('0664 1234567')
    for (const add of wrapper
      .findAll('button')
      .filter((button) => button.text() === 'hinzufügen')) {
      await add.trigger('click')
    }
    await wrapper.find('input#user-auth-locked').setValue(true)
    await saveButton(wrapper)?.trigger('click')
    await flushPromises()

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_locked: true,
        instruments: ['i1'],
        voices: ['v1'],
        choirjobs: ['c1'],
        roles: ['r1'],
      }),
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
