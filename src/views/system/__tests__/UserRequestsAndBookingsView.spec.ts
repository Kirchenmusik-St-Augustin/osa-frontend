import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import UserRequestsAndBookingsView from '../UserRequestsAndBookingsView.vue'
import type { PerformanceShortBase } from '@/composables/useBookings'
import type { User } from '@/composables/useUsers'

const mockGet = vi.fn()
const mockGetRequestsAndBookings = vi.fn()
vi.mock('@/composables/useUsers', () => ({
  useUsers: () => ({ get: mockGet, getRequestsAndBookings: mockGetRequestsAndBookings }),
}))

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 7,
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

function makeEntry(overrides: Partial<PerformanceShortBase> = {}): PerformanceShortBase {
  return {
    id: 1,
    ordinariumwork_name: 'Krönungsmesse',
    ordinariumwork_artist_name: 'MOZART, Wolfgang',
    artist_name: null,
    schedule: '2099-01-01T12:00:00',
    location: { id: 1, name: 'Augustinerkirche', color: '336699', address: null },
    user_booking: { status: 4, position: { id: 2, name: 'Fagott' }, at: null },
    proprium: [],
    demanding_proprium: false,
    rehearsals: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue(makeUser())
})

describe('UserRequestsAndBookingsView', () => {
  it('loads and lists the requests and bookings for the given user id', async () => {
    mockGetRequestsAndBookings.mockResolvedValueOnce([makeEntry()])
    const wrapper = mount(UserRequestsAndBookingsView, { props: { id: '7' } })
    await flushPromises()

    expect(mockGetRequestsAndBookings).toHaveBeenCalledWith(7)
    expect(wrapper.text()).toContain('MOZART, Wolfgang: Krönungsmesse')
    expect(wrapper.text()).toContain('Gebucht für Fagott')
  })

  it("renders both page-subtitles (label + user name), 1:1 Legacy's double page-subtitle", async () => {
    // Legacy's Content/System/Users/RequestsAndBookings.vue renders two
    // page-subtitle lines: "Anfragen und Buchungen für" and the user's
    // "SURNAME, Givenname".
    mockGet.mockResolvedValueOnce(makeUser({ surname: 'SCHINDLER', givenname: 'Margot' }))
    mockGetRequestsAndBookings.mockResolvedValueOnce([])
    const wrapper = mount(UserRequestsAndBookingsView, { props: { id: '7' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(7)
    expect(wrapper.text()).toContain('Anfragen und Buchungen für')
    expect(wrapper.text()).toContain('SCHINDLER, Margot')
  })

  it('renders both back links to the user Show page', async () => {
    mockGetRequestsAndBookings.mockResolvedValueOnce([])
    const wrapper = mount(UserRequestsAndBookingsView, { props: { id: '7' } })
    await flushPromises()

    const backLinks = wrapper.findAllComponents(RouterLinkStub)
    expect(backLinks).toHaveLength(2)
    for (const link of backLinks) {
      expect(link.props('to')).toEqual({ name: 'system-users-show', params: { id: '7' } })
    }
  })

  it('renders no rows when there are none', async () => {
    mockGetRequestsAndBookings.mockResolvedValueOnce([])
    const wrapper = mount(UserRequestsAndBookingsView, { props: { id: '7' } })
    await flushPromises()

    expect(wrapper.findAll('tbody tr')).toHaveLength(0)
  })
})
