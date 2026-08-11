import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ProfileShowView from '../ProfileShowView.vue'
import type { User } from '@/composables/useUsers'

const mockGet = vi.fn()
const mockDisconnectOauth2 = vi.fn()
vi.mock('@/composables/useProfile', () => ({
  useProfile: () => ({ get: mockGet, disconnectOauth2: mockDisconnectOauth2 }),
}))

const mockGetEnvironment = vi.fn()
vi.mock('@/composables/useSystem', () => ({
  useSystem: () => ({ getEnvironment: mockGetEnvironment }),
}))

let mockAppEnvironment: string | undefined
vi.mock('@/runtimeConfig', () => ({
  appEnvironment: () => mockAppEnvironment,
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
  mockGetEnvironment.mockResolvedValue({ environment: 'development' })
  mockAppEnvironment = 'development'
})

describe('ProfileShowView', () => {
  it('loads and renders the own profile data', async () => {
    mockGet.mockResolvedValueOnce(makeUser())
    const wrapper = mount(ProfileShowView)
    await flushPromises()

    expect(mockGet).toHaveBeenCalled()
    expect(wrapper.text()).toContain('SCHINDLER')
    expect(wrapper.text()).toContain('margot@example.com')
  })

  it('omits the "Verbundene Konten" card when there are no oauth2 bindings', async () => {
    mockGet.mockResolvedValueOnce(makeUser({ oauth2_bindings: [] }))
    const wrapper = mount(ProfileShowView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Verbundene Konten')
  })

  it('lists connected accounts with their capitalized provider name', async () => {
    mockGet.mockResolvedValueOnce(
      makeUser({
        oauth2_bindings: [{ id: 9, provider: 'google', remote_name: 'Margot S.' }],
      }),
    )
    const wrapper = mount(ProfileShowView)
    await flushPromises()

    expect(wrapper.text()).toContain('Verbundene Konten')
    expect(wrapper.text()).toContain('Google')
  })

  it('removes a binding after confirmation, updating the list locally', async () => {
    mockGet.mockResolvedValueOnce(
      makeUser({
        oauth2_bindings: [{ id: 9, provider: 'google', remote_name: 'Margot S.' }],
      }),
    )
    mockDisconnectOauth2.mockResolvedValueOnce(undefined)
    const wrapper = mount(ProfileShowView)
    await flushPromises()

    await wrapper.find('.fa-trash-alt').trigger('click')
    await flushPromises()

    expect(mockDisconnectOauth2).toHaveBeenCalledWith(9)
    expect(mockShowToast).toHaveBeenCalledWith('Bindung entfernt')
    expect(wrapper.text()).not.toContain('Verbundene Konten')
  })

  it('does not remove a binding when the confirmation is declined', async () => {
    mockGet.mockResolvedValueOnce(
      makeUser({
        oauth2_bindings: [{ id: 9, provider: 'google', remote_name: 'Margot S.' }],
      }),
    )
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(ProfileShowView)
    await flushPromises()

    await wrapper.find('.fa-trash-alt').trigger('click')
    await flushPromises()

    expect(mockDisconnectOauth2).not.toHaveBeenCalled()
  })

  it('shows the backend and frontend deployment environment in the footer', async () => {
    mockGet.mockResolvedValueOnce(makeUser())
    mockGetEnvironment.mockResolvedValueOnce({ environment: 'qa' })
    mockAppEnvironment = 'production'
    const wrapper = mount(ProfileShowView)
    await flushPromises()

    expect(wrapper.text()).toContain('Backend: qa')
    expect(wrapper.text()).toContain('Frontend: production')
  })

  it('omits the backend environment line when the fetch fails, without breaking the page', async () => {
    mockGet.mockResolvedValueOnce(makeUser())
    mockGetEnvironment.mockRejectedValueOnce(new Error('network error'))
    const wrapper = mount(ProfileShowView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Backend:')
    expect(wrapper.text()).toContain('SCHINDLER')
  })
})
