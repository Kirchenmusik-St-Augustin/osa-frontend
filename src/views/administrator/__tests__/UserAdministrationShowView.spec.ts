import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UserAdministrationShowView from '../UserAdministrationShowView.vue'
import type {
  UserAdministrationActionResult,
  UserAdministrationDetail,
} from '@/composables/useUserAdministration'

const mockPush = vi.fn()
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockGet = vi.fn()
const mockRestore = vi.fn()
const mockUnlock = vi.fn()
const mockSetPassword = vi.fn()
const mockPurge = vi.fn()
vi.mock('@/composables/useUserAdministration', () => ({
  useUserAdministration: () => ({
    get: mockGet,
    restore: mockRestore,
    unlock: mockUnlock,
    setPassword: mockSetPassword,
    purge: mockPurge,
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
    id: '1',
    surname: 'MUSTER',
    givenname: 'Max',
    email: 'max@example.com',
    phone: '+43 660 1234567',
    email_verified_at: null,
    auth_locked: false,
    deleted_at: null,
    auth_lastsignal: null,
    purgeable: false,
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

    expect(mockGet).toHaveBeenCalledWith('1')
    expect(wrapper.text()).toContain('MUSTER, Max')
    expect(wrapper.text()).toContain('max@example.com')
  })

  it('shows a placeholder and a login warning when the account has no email', async () => {
    mockGet.mockResolvedValueOnce(makeResult({ email: null }))
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Keine E-Mail-Adresse hinterlegt')
    expect(wrapper.text()).toContain('Ohne E-Mail-Adresse ist kein Login möglich.')
    const buttons = wrapper.findAll('button').map((button) => button.text())
    expect(buttons).toContain('setze ein generiertes Passwort')
  })

  it('shows neither placeholder nor login warning when the account has an email', async () => {
    mockGet.mockResolvedValueOnce(makeResult())
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Keine E-Mail-Adresse hinterlegt')
    expect(wrapper.text()).not.toContain('kein Login möglich')
  })

  it('shows the phone number, or a dash when none is stored', async () => {
    mockGet.mockResolvedValueOnce(makeResult())
    const withPhone = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()
    expect(withPhone.text()).toContain('Telefon:+43 660 1234567')

    mockGet.mockResolvedValueOnce(makeResult({ phone: null }))
    const withoutPhone = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()
    expect(withoutPhone.text()).toContain('Telefon:–')
  })

  it('shows the last activity formatted, or "noch nie" when there is none', async () => {
    mockGet.mockResolvedValueOnce(makeResult({ auth_lastsignal: '2026-09-30T10:15:00+00:00' }))
    const active = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()
    expect(active.text()).toContain('Letzte Aktivität:')
    expect(active.text()).not.toContain('noch nie')

    mockGet.mockResolvedValueOnce(makeResult({ auth_lastsignal: null }))
    const inactive = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()
    expect(inactive.text()).toContain('Letzte Aktivität:noch nie')
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

    expect(mockRestore).toHaveBeenCalledWith('1')
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

    expect(mockUnlock).toHaveBeenCalledWith('1')
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

    expect(mockSetPassword).toHaveBeenCalledWith('1')
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

  it('offers "dauerhaft löschen" only for a deleted, purgeable account', async () => {
    mockGet.mockResolvedValueOnce(
      makeResult({ deleted_at: '2026-01-01T00:00:00+00:00', purgeable: true }),
    )
    const purgeable = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()
    expect(purgeable.findAll('button').map((b) => b.text())).toContain('dauerhaft löschen')

    mockGet.mockResolvedValueOnce(
      makeResult({ deleted_at: '2026-01-01T00:00:00+00:00', purgeable: false }),
    )
    const blocked = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()
    expect(blocked.findAll('button').map((b) => b.text())).not.toContain('dauerhaft löschen')
    expect(blocked.text()).toContain('Dauerhaftes Löschen nicht möglich')
  })

  it('never offers "dauerhaft löschen" for an active account', async () => {
    mockGet.mockResolvedValueOnce(makeResult({ purgeable: false }))
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.findAll('button').map((b) => b.text())).not.toContain('dauerhaft löschen')
    expect(wrapper.text()).not.toContain('Dauerhaftes Löschen nicht möglich')
  })

  it('purges after confirmation and returns to the search', async () => {
    mockGet.mockResolvedValueOnce(
      makeResult({ deleted_at: '2026-01-01T00:00:00+00:00', purgeable: true }),
    )
    mockPurge.mockResolvedValueOnce(undefined)
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'dauerhaft löschen')
      ?.trigger('click')
    await flushPromises()

    expect(mockPurge).toHaveBeenCalledWith('1')
    expect(mockShowToast).toHaveBeenCalledWith('Benutzerkonto dauerhaft gelöscht')
    expect(mockPush).toHaveBeenCalledWith({ name: 'administrator-users-search' })
  })

  it('does not purge when the confirmation is declined', async () => {
    mockGet.mockResolvedValueOnce(
      makeResult({ deleted_at: '2026-01-01T00:00:00+00:00', purgeable: true }),
    )
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'dauerhaft löschen')
      ?.trigger('click')
    await flushPromises()

    expect(mockPurge).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows the backend message and stays on the page when purging fails', async () => {
    mockGet.mockResolvedValueOnce(
      makeResult({ deleted_at: '2026-01-01T00:00:00+00:00', purgeable: true }),
    )
    mockPurge.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['body', 'general'], msg: 'Noch Buchungen.' }] } },
    })
    const wrapper = mount(UserAdministrationShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'dauerhaft löschen')
      ?.trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Noch Buchungen.', true)
    expect(mockPush).not.toHaveBeenCalled()
  })
})
