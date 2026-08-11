import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UserAdministrationShowView from '../UserAdministrationShowView.vue'
import type {
  UserAdministrationActionResult,
  UserAdministrationDetail,
} from '@/composables/useUserAdministration'

const mockGet = vi.fn()
const mockRestore = vi.fn()
const mockUnlock = vi.fn()
const mockSetPassword = vi.fn()
vi.mock('@/composables/useUserAdministration', () => ({
  useUserAdministration: () => ({
    get: mockGet,
    restore: mockRestore,
    unlock: mockUnlock,
    setPassword: mockSetPassword,
  }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

function makeUser(overrides: Partial<UserAdministrationDetail> = {}): UserAdministrationDetail {
  return {
    id: 1,
    surname: 'MUSTER',
    givenname: 'Max',
    email: 'max@example.com',
    email_verified_at: null,
    auth_locked: false,
    deleted_at: null,
    auth_lastsignal: null,
    ...overrides,
  }
}

function makeResult(
  overrides: Partial<UserAdministrationDetail> = {},
  newpw: string | null = null,
): UserAdministrationActionResult {
  return { user: makeUser(overrides), newpw }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConfirmAction.mockResolvedValue(true)
})

describe('UserAdministrationShowView', () => {
  it('loads and renders the name and email subtitles', async () => {
    mockGet.mockResolvedValueOnce(makeResult())
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('MUSTER, Max')
    expect(wrapper.text()).toContain('max@example.com')
  })

  it('shows "nein" for a non-deleted account and the two status lines', async () => {
    mockGet.mockResolvedValueOnce(makeResult({ auth_locked: false, email_verified_at: null }))
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Benutzerkonto gelöscht:')
    expect(wrapper.text()).toContain('nein')
    expect(wrapper.text()).toContain('Benutzer gesperrt:')
    expect(wrapper.text()).toContain('E-Mail-Bestätigung ausständig:')
  })

  it('shows only "wiederherstellen" for a deleted account, no lock/verify status', async () => {
    mockGet.mockResolvedValueOnce(makeResult({ deleted_at: '2026-01-01T00:00:00+00:00' }))
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Benutzer gesperrt:')
    expect(wrapper.text()).not.toContain('E-Mail-Bestätigung ausständig:')
    const buttons = wrapper.findAll('button').map((button) => button.text())
    expect(buttons).toContain('wiederherstellen')
    expect(buttons).not.toContain('entsperren')
    expect(buttons).not.toContain('setze ein generiertes Passwort')
  })

  it('restores a deleted account and refreshes the view state', async () => {
    mockGet.mockResolvedValueOnce(makeResult({ deleted_at: '2026-01-01T00:00:00+00:00' }))
    mockRestore.mockResolvedValueOnce(makeResult({ deleted_at: null }))
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'wiederherstellen')
      ?.trigger('click')
    await flushPromises()

    expect(mockRestore).toHaveBeenCalledWith(1)
    expect(mockShowToast).toHaveBeenCalledWith('Aktion durchgeführt')
    expect(wrapper.text()).toContain('nein')
  })

  it('shows "entsperren" for a locked account and unlocks on click', async () => {
    mockGet.mockResolvedValueOnce(makeResult({ auth_locked: true }))
    mockUnlock.mockResolvedValueOnce(makeResult({ auth_locked: false }))
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    const button = wrapper.findAll('button').find((b) => b.text() === 'entsperren')
    expect(button).toBeDefined()
    await button?.trigger('click')
    await flushPromises()

    expect(mockUnlock).toHaveBeenCalledWith(1)
  })

  it('shows "setze ein generiertes Passwort" for an unlocked account and displays the one-time password', async () => {
    mockGet.mockResolvedValueOnce(makeResult({ auth_locked: false }))
    mockSetPassword.mockResolvedValueOnce(makeResult({}, 'aB3xY9kLmQ'))
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    const button = wrapper
      .findAll('button')
      .find((b) => b.text() === 'setze ein generiertes Passwort')
    await button?.trigger('click')
    await flushPromises()

    expect(mockSetPassword).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Neues Passwort')
    expect(wrapper.text()).toContain('aB3xY9kLmQ')
    expect(wrapper.text()).toContain('wird nur einmal angezeigt!')
  })

  it('does not act when the confirmation is declined', async () => {
    mockGet.mockResolvedValueOnce(makeResult({ auth_locked: true }))
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    const button = wrapper.findAll('button').find((b) => b.text() === 'entsperren')
    await button?.trigger('click')
    await flushPromises()

    expect(mockUnlock).not.toHaveBeenCalled()
  })

  it('shows a German error toast when the action fails', async () => {
    mockGet.mockResolvedValueOnce(makeResult({ auth_locked: true }))
    mockUnlock.mockRejectedValueOnce(new Error('forbidden'))
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    const button = wrapper.findAll('button').find((b) => b.text() === 'entsperren')
    await button?.trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(
      'Bei Durchführung von "entsperren" ist ein Fehler aufgetreten.',
      true,
    )
  })
})
