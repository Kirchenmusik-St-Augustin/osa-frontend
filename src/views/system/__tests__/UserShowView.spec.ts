import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import UserShowView from '../UserShowView.vue'
import type { User } from '@/composables/useUsers'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockGet = vi.fn()
const mockRemove = vi.fn()
vi.mock('@/composables/useUsers', () => ({
  useUsers: () => ({ get: mockGet, remove: mockRemove }),
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
    email: null,
    email_verified_at: null,
    phone: '0664 9182108',
    auth_lastsignal: null,
    auth_locked: false,
    administrator: false,
    deletable: true,
    oauth2_bindings: [],
    instruments: [],
    voices: [],
    choirjobs: [{ id: 3, name: 'Substitut' }],
    roles: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('UserShowView', () => {
  it('loads and renders the subtitle, fields and abilities', async () => {
    mockGet.mockResolvedValueOnce(makeUser())
    const wrapper = mount(UserShowView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('SCHINDLER, Margot')
    expect(wrapper.text()).toContain('0664 9182108')
    expect(wrapper.text()).toContain('Substitut')
  })

  it('shows "unbekannt" when no email is set', async () => {
    mockGet.mockResolvedValueOnce(makeUser({ email: null }))
    const wrapper = mount(UserShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('unbekannt')
  })

  it('shows "nicht verifiziert" for an unverified email', async () => {
    mockGet.mockResolvedValueOnce(
      makeUser({ email: 'margot@example.com', email_verified_at: null }),
    )
    const wrapper = mount(UserShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('margot@example.com')
    expect(wrapper.text()).toContain('nicht verifiziert')
  })

  it('shows the verification date for a verified email', async () => {
    mockGet.mockResolvedValueOnce(
      makeUser({
        email: 'margot@example.com',
        email_verified_at: '2023-12-28T16:50:00+00:00',
      }),
    )
    const wrapper = mount(UserShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('E-Mail-Adresse verifiziert am:')
  })

  it('shows "nicht bekannt" when auth_lastsignal is unset', async () => {
    mockGet.mockResolvedValueOnce(makeUser({ auth_lastsignal: null }))
    const wrapper = mount(UserShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('nicht bekannt')
  })

  it('shows the administrator and gesperrt badges only when set', async () => {
    mockGet.mockResolvedValueOnce(makeUser({ administrator: true, auth_locked: true }))
    const wrapper = mount(UserShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Benutzer ist Administrator')
    expect(wrapper.text()).toContain('Benutzer ist gesperrt')
  })

  it('shows an enabled delete button when deletable', async () => {
    mockGet.mockResolvedValueOnce(makeUser({ deletable: true }))
    const wrapper = mount(UserShowView, { props: { id: '1' } })
    await flushPromises()

    const button = wrapper.find('button.btn-danger')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('shows a disabled delete button with a tooltip when not deletable', async () => {
    mockGet.mockResolvedValueOnce(makeUser({ deletable: false }))
    const wrapper = mount(UserShowView, { props: { id: '1' } })
    await flushPromises()

    const button = wrapper.find('button.btn-danger')
    expect(button.attributes('disabled')).toBeDefined()
    expect(
      wrapper.find('[title="Konto hat Sonderrechte oder noch künftige Buchungen."]').exists(),
    ).toBe(true)
  })

  it('deletes after confirmation and navigates back to search', async () => {
    mockGet.mockResolvedValueOnce(makeUser({ deletable: true }))
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockResolvedValueOnce(undefined)
    const wrapper = mount(UserShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('button.btn-danger').trigger('click')
    await flushPromises()

    expect(mockRemove).toHaveBeenCalledWith(1)
    expect(mockShowToast).toHaveBeenCalledWith('gelöscht.')
    expect(mockPush).toHaveBeenCalledWith({ name: 'system-users-search' })
  })

  it('links to the requests-and-bookings view for this account', async () => {
    mockGet.mockResolvedValueOnce(makeUser())
    const wrapper = mount(UserShowView, { props: { id: '1' } })
    await flushPromises()

    const links = wrapper.findAllComponents(RouterLinkStub)
    const requestsLink = links.find(
      (link) => link.props('to')?.name === 'system-users-requests-and-bookings',
    )
    expect(requestsLink).toBeDefined()
    expect(requestsLink?.props('to')).toEqual({
      name: 'system-users-requests-and-bookings',
      params: { id: '1' },
    })
    expect(requestsLink?.text()).toBe('Anfragen und Buchungen für dieses Konto einsehen')
  })

  it('shows the in-use message when delete is blocked', async () => {
    mockGet.mockResolvedValueOnce(makeUser({ deletable: true }))
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['body', 'general'], msg: 'in use' }] } },
    })
    const wrapper = mount(UserShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('button.btn-danger').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('in use', true)
  })
})
