import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PerformanceCalendarView from '../PerformanceCalendarView.vue'
import type { PerformanceCalendarItem } from '@/composables/usePerformances'

let mockQuery: Record<string, string> = {}
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRoute: () => ({ query: mockQuery }),
}))

const mockListForMonth = vi.fn()
vi.mock('@/composables/usePerformances', () => ({
  usePerformances: () => ({ listForMonth: mockListForMonth }),
}))

let mockPermissions: string[] = []
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: (permission: string) => mockPermissions.includes(permission),
  }),
}))

function makeItem(overrides: Partial<PerformanceCalendarItem> = {}): PerformanceCalendarItem {
  return {
    id: 1,
    schedule: '2026-08-02T11:00:00',
    location: { id: 1, name: 'Augustinerkirche', color: '336699', address: null },
    ordinariumwork_id: 5,
    ordinariumwork_name: 'Krönungsmesse',
    ordinariumwork_artist_name: 'MOZART, Wolfgang',
    ordinariumwork_demanding: false,
    artist_name: null,
    proprium: [],
    demanding_proprium: false,
    rehearsals: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockQuery = { year: '2026', month: '8' }
  mockPermissions = []
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

  it('shows the empty-state text when there are no performances', async () => {
    mockListForMonth.mockResolvedValueOnce([])
    const wrapper = mount(PerformanceCalendarView)
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Monat sind keine Aufführungen geplant.')
  })

  it('defaults to the current month when no query params are given', async () => {
    mockQuery = {}
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
})
