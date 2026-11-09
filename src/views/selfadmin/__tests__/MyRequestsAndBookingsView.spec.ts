import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MyRequestsAndBookingsView from '../MyRequestsAndBookingsView.vue'
import type { PerformanceShortBase } from '@/composables/useBookings'
import { testId } from '@/__tests__/testId'

const mockGetMyRequestsAndBookings = vi.fn()
vi.mock('@/composables/useSupport', () => ({
  useSupport: () => ({ getMyRequestsAndBookings: mockGetMyRequestsAndBookings }),
}))

const mockChangeBookingStatus = vi.fn()
vi.mock('@/composables/useBookings', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useBookings: () => ({ changeBookingStatus: mockChangeBookingStatus }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

let mockPermissions: string[] = []
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: (permission: string) => mockPermissions.includes(permission),
  }),
}))

function makeItem(overrides: Partial<PerformanceShortBase> = {}): PerformanceShortBase {
  return {
    id: testId(1),
    ordinariumwork_name: 'Krönungsmesse',
    ordinariumwork_artist_name: 'MOZART, Wolfgang',
    artist_name: null,
    schedule: '2099-01-01T12:00:00',
    location: { id: testId(1), name: 'Augustinerkirche', color: '336699', address: null },
    user_booking: { status: 1, position: null, at: null },
    proprium: [],
    demanding_proprium: false,
    rehearsals: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockPermissions = []
  mockConfirmAction.mockResolvedValue(true)
})

describe('MyRequestsAndBookingsView', () => {
  it('loads and lists the upcoming requests and bookings', async () => {
    mockGetMyRequestsAndBookings.mockResolvedValueOnce([makeItem()])
    const wrapper = mount(MyRequestsAndBookingsView)
    await flushPromises()

    expect(mockGetMyRequestsAndBookings).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Krönungsmesse')
  })

  it('tells the member when the list cannot be loaded instead of claiming there are none', async () => {
    mockGetMyRequestsAndBookings.mockRejectedValueOnce(new Error('offline'))
    const wrapper = mount(MyRequestsAndBookingsView)
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein unerwarteter Fehler ist aufgetreten.', true)
    expect(wrapper.find('.card').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Derzeit liegen keine Anfragen oder Buchungen vor.')
  })

  it('uses its own text when the load error carries no message of its own', async () => {
    mockGetMyRequestsAndBookings.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'x'], msg: 'Ungültig.' }] } },
    })
    mount(MyRequestsAndBookingsView)
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(
      'Die Anfragen und Buchungen konnten nicht geladen werden.',
      true,
    )
  })

  it('shows the empty-state text when there are none', async () => {
    mockGetMyRequestsAndBookings.mockResolvedValueOnce([])
    const wrapper = mount(MyRequestsAndBookingsView)
    await flushPromises()

    expect(wrapper.text()).toContain('Derzeit liegen keine Anfragen oder Buchungen vor.')
  })

  it('changes the booking status and reloads on confirmed trigger click', async () => {
    mockGetMyRequestsAndBookings.mockResolvedValueOnce([makeItem()])
    const wrapper = mount(MyRequestsAndBookingsView)
    await flushPromises()

    mockChangeBookingStatus.mockResolvedValueOnce({ status: 2, position: null, at: null })
    mockGetMyRequestsAndBookings.mockResolvedValueOnce([
      makeItem({ user_booking: { status: 2, position: null, at: null } }),
    ])

    await wrapper.find('.fa-hand-point-up').trigger('click')
    await flushPromises()

    expect(mockChangeBookingStatus).toHaveBeenCalledWith(testId(1))
    expect(mockGetMyRequestsAndBookings).toHaveBeenCalledTimes(2)
  })

  it('does not change the booking status when the confirmation is declined', async () => {
    mockGetMyRequestsAndBookings.mockResolvedValueOnce([makeItem()])
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(MyRequestsAndBookingsView)
    await flushPromises()

    await wrapper.find('.fa-hand-point-up').trigger('click')
    await flushPromises()

    expect(mockChangeBookingStatus).not.toHaveBeenCalled()
  })

  it('shows an error toast when changing the booking status fails', async () => {
    mockGetMyRequestsAndBookings.mockResolvedValueOnce([makeItem()])
    const wrapper = mount(MyRequestsAndBookingsView)
    await flushPromises()

    mockChangeBookingStatus.mockRejectedValueOnce(new Error('boom'))
    await wrapper.find('.fa-hand-point-up').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein unerwarteter Fehler ist aufgetreten.', true)
  })

  it('renders the show-menu dropdown toggle on each card', async () => {
    mockGetMyRequestsAndBookings.mockResolvedValueOnce([makeItem()])
    const wrapper = mount(MyRequestsAndBookingsView)
    await flushPromises()

    expect(wrapper.find('.dropdown-toggle').exists()).toBe(true)
  })
})
