import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import RequestsAndBookingsView from '../RequestsAndBookingsView.vue'
import type { PerformanceRequestsAndBookings } from '@/composables/useBookings'

const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

const mockGetRequestsAndBookings = vi.fn()
vi.mock('@/composables/useBookings', () => ({
  useBookings: () => ({ getRequestsAndBookings: mockGetRequestsAndBookings }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ hasPermission: () => false }),
}))

function makePage(
  overrides: Partial<PerformanceRequestsAndBookings> = {},
): PerformanceRequestsAndBookings {
  return {
    id: '1',
    ordinariumwork_name: 'Krönungsmesse',
    ordinariumwork_artist_name: 'MOZART, Wolfgang',
    artist_name: null,
    schedule: '2026-08-02T11:00:00',
    location: { id: '1', name: 'Augustinerkirche', color: '336699', address: null },
    user_booking: { status: 0, position: null, at: null },
    proprium: [],
    demanding_proprium: false,
    rehearsals: [],
    entries: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('RequestsAndBookingsView', () => {
  it('fetches and renders a table of entries with status badges', async () => {
    mockGetRequestsAndBookings.mockResolvedValueOnce(
      makePage({
        entries: [
          { id: '1', name: 'HUBER, Franz', status: { status: 4, position: null, at: null } },
          { id: '2', name: 'MAYER, Anna', status: { status: 2, position: null, at: null } },
        ],
      }),
    )
    const wrapper = mount(RequestsAndBookingsView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGetRequestsAndBookings).toHaveBeenCalledWith('1')
    expect(wrapper.text()).toContain('HUBER, Franz')
    expect(wrapper.text()).toContain('MAYER, Anna')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('tells the user when the entries cannot be loaded instead of the "no entries" text', async () => {
    mockGetRequestsAndBookings.mockRejectedValueOnce(new Error('network'))
    const wrapper = mount(RequestsAndBookingsView, { props: { id: '1' } })
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein unerwarteter Fehler ist aufgetreten.', true)
    expect(wrapper.text()).not.toContain('Derzeit liegen keine Buchungen')
  })

  it('shows a fallback message when there are no entries', async () => {
    mockGetRequestsAndBookings.mockResolvedValueOnce(makePage({ entries: [] }))
    const wrapper = mount(RequestsAndBookingsView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.text()).toContain('Derzeit liegen keine Buchungen oder Anfragen vor.')
  })

  it('both "zurück" links (above and below the table) go to the calendar month of the performance, not its show page', async () => {
    // "zurück" is rendered TWICE (before and after the table) and both link
    // to the calendar (`year`/`month` query), never to the performance's own
    // show/detail page.
    mockGetRequestsAndBookings.mockResolvedValueOnce(makePage())
    const wrapper = mount(RequestsAndBookingsView, { props: { id: '1' } })
    await flushPromises()

    const backLinks = wrapper.findAllComponents(RouterLinkStub)
    expect(backLinks).toHaveLength(2)
    for (const link of backLinks) {
      expect(link.props('to')).toEqual({ name: 'home', query: { year: 2026, month: 8 } })
    }
  })

  it('uses its own text when the load error carries no message of its own', async () => {
    mockGetRequestsAndBookings.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'x'], msg: 'Ungültig.' }] } },
    })
    mount(RequestsAndBookingsView, { props: { id: '1' } })
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(
      'Die Anfragen und Buchungen konnten nicht geladen werden.',
      true,
    )
  })
})
