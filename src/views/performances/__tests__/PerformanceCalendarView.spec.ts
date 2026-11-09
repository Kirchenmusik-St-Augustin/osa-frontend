import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import PerformanceCalendarView from '../PerformanceCalendarView.vue'
import type { PerformanceCalendarItem } from '@/composables/usePerformances'
import { testId } from '@/__tests__/testId'

let mockQuery = reactive<Record<string, string>>({})
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRoute: () => ({ query: mockQuery }),
}))

const mockListForMonth = vi.fn()
vi.mock('@/composables/usePerformances', () => ({
  usePerformances: () => ({ listForMonth: mockListForMonth }),
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

function makeItem(overrides: Partial<PerformanceCalendarItem> = {}): PerformanceCalendarItem {
  return {
    id: testId(1),
    schedule: '2026-08-02T11:00:00',
    location: { id: testId(1), name: 'Augustinerkirche', color: '336699', address: null },
    ordinariumwork_id: testId(5),
    ordinariumwork_name: 'Krönungsmesse',
    ordinariumwork_artist_name: 'MOZART, Wolfgang',
    ordinariumwork_demanding: false,
    artist_name: null,
    user_booking: { status: 0, position: null, at: null },
    proprium: [],
    demanding_proprium: false,
    rehearsals: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockQuery = reactive({ year: '2026', month: '8' })
  mockPermissions = []
  mockConfirmAction.mockResolvedValue(true)
})

describe('PerformanceCalendarView', () => {
  it('loads and lists performances for the requested month', async () => {
    mockListForMonth.mockResolvedValueOnce([makeItem()])
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()

    expect(mockListForMonth).toHaveBeenCalledWith(2026, 8)
    expect(wrapper.text()).toContain('Krönungsmesse')
    expect(wrapper.text()).toContain('August 2026')
  })

  it('tells the user when the month cannot be loaded instead of claiming nothing is planned', async () => {
    mockListForMonth.mockRejectedValueOnce(new Error('network'))
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein unerwarteter Fehler ist aufgetreten.', true)
    expect(wrapper.find('.card').exists()).toBe(false)
  })

  it('shows the empty-state text when there are no performances', async () => {
    mockListForMonth.mockResolvedValueOnce([])
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Monat sind keine Aufführungen geplant.')
  })

  it('defaults to the current month when no query params are given', async () => {
    mockQuery = reactive({})
    mockListForMonth.mockResolvedValueOnce([])
    mount(PerformanceCalendarView)
    await flushPromises()

    const now = new Date()
    expect(mockListForMonth).toHaveBeenCalledWith(now.getFullYear(), now.getMonth() + 1)
  })

  it('hides the "Aufführung anlegen" button without performanceMaintain', async () => {
    mockListForMonth.mockResolvedValueOnce([])
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Aufführung anlegen')
  })

  it('shows the "Aufführung anlegen" button with performanceMaintain', async () => {
    mockPermissions = ['performanceMaintain']
    mockListForMonth.mockResolvedValueOnce([])
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()

    expect(wrapper.text()).toContain('Aufführung anlegen')
  })

  it('changes the booking status and reloads the month on confirmed trigger click', async () => {
    mockListForMonth.mockResolvedValueOnce([
      makeItem({ user_booking: { status: 1, position: null, at: null } }),
    ])
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()

    mockChangeBookingStatus.mockResolvedValueOnce({ status: 2, position: null, at: null })
    mockListForMonth.mockResolvedValueOnce([
      makeItem({ user_booking: { status: 2, position: null, at: null } }),
    ])

    await wrapper.find('.fa-hand-point-up').trigger('click')
    await flushPromises()

    expect(mockChangeBookingStatus).toHaveBeenCalledWith(testId(1))
    expect(mockListForMonth).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('angefragt')
  })

  it('does not change the booking status when the confirmation is declined', async () => {
    mockListForMonth.mockResolvedValueOnce([
      makeItem({ user_booking: { status: 1, position: null, at: null } }),
    ])
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()

    await wrapper.find('.fa-hand-point-up').trigger('click')
    await flushPromises()

    expect(mockChangeBookingStatus).not.toHaveBeenCalled()
  })

  it('shows an error toast when changing the booking status fails', async () => {
    mockListForMonth.mockResolvedValueOnce([
      makeItem({ user_booking: { status: 1, position: null, at: null } }),
    ])
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()

    mockChangeBookingStatus.mockRejectedValueOnce(new Error('boom'))
    await wrapper.find('.fa-hand-point-up').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein unerwarteter Fehler ist aufgetreten.', true)
  })

  it('drops a late answer for a month that is no longer shown', async () => {
    let finishFirst: (value: unknown) => void = () => {}
    mockListForMonth.mockReturnValueOnce(
      new Promise((resolve) => {
        finishFirst = resolve
      }),
    )
    mockListForMonth.mockResolvedValueOnce([makeItem({ ordinariumwork_name: 'Septembermesse' })])
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()
    mockQuery['month'] = '9'
    await flushPromises()

    finishFirst([makeItem({ ordinariumwork_name: 'Augustmesse' })])
    await flushPromises()

    expect(wrapper.text()).toContain('Septembermesse')
    expect(wrapper.text()).not.toContain('Augustmesse')
  })

  it('does not claim that nothing was found when the load fails', async () => {
    mockListForMonth.mockRejectedValueOnce(new Error('network'))
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein unerwarteter Fehler ist aufgetreten.', true)
    expect(wrapper.text()).not.toContain('Für diesen Monat sind keine Aufführungen geplant.')
  })

  it('shows neither the previous data nor the empty text after a later load fails', async () => {
    mockListForMonth.mockResolvedValueOnce([makeItem({ ordinariumwork_name: 'Augustmesse' })])
    mockListForMonth.mockRejectedValueOnce(new Error('network'))
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()
    expect(wrapper.text()).toContain('Augustmesse')
    mockQuery['month'] = '9'
    await flushPromises()

    expect(wrapper.text()).not.toContain('Augustmesse')
    expect(wrapper.text()).not.toContain('Für diesen Monat sind keine Aufführungen geplant.')
  })

  it('shows the empty text again once a later load succeeds with nothing', async () => {
    mockListForMonth.mockRejectedValueOnce(new Error('network'))
    mockListForMonth.mockResolvedValueOnce([])
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()
    mockQuery['month'] = '9'
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Monat sind keine Aufführungen geplant.')
  })

  it('ignores the failure of an older request once a newer one has been answered', async () => {
    let failFirst: (reason: unknown) => void = () => {}
    mockListForMonth.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        failFirst = reject
      }),
    )
    mockListForMonth.mockResolvedValueOnce([makeItem({ ordinariumwork_name: 'Septembermesse' })])
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()
    mockQuery['month'] = '9'
    await flushPromises()

    failFirst(new Error('late failure'))
    await flushPromises()

    expect(mockShowToast).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Septembermesse')
  })

  it('uses its own text when the load error carries no message of its own', async () => {
    mockListForMonth.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'x'], msg: 'Ungültig.' }] } },
    })
    mount(PerformanceCalendarView)
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Der Kalender konnte nicht geladen werden.', true)
  })
})
