import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import RequestLogIndexView from '../RequestLogIndexView.vue'
import type { RequestLogDayGroup } from '@/composables/useRequestLogs'

let mockQuery: Record<string, string> = {}
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRoute: () => ({ query: mockQuery }),
}))

const mockListDaysWithUsersForMonth = vi.fn()
vi.mock('@/composables/useRequestLogs', () => ({
  useRequestLogs: () => ({ listDaysWithUsersForMonth: mockListDaysWithUsersForMonth }),
}))

function makeDayGroup(overrides: Partial<RequestLogDayGroup> = {}): RequestLogDayGroup {
  return {
    day: '2026-08-12',
    users: [{ id: 1, label: 'SCHINDLER, Margot' }],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockQuery = { year: '2026', month: '8' }
})

describe('RequestLogIndexView', () => {
  it('loads day groups for the requested month (no day argument)', async () => {
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([makeDayGroup()])
    mount(RequestLogIndexView)
    await flushPromises()

    expect(mockListDaysWithUsersForMonth).toHaveBeenCalledWith(2026, 8)
  })

  it('renders each day group under a collapsible heading', async () => {
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([makeDayGroup()])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()

    expect(wrapper.text()).toContain('12. August 2026')
  })

  it("reveals the day's users only after the caret is toggled", async () => {
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([makeDayGroup()])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('SCHINDLER, Margot')

    await wrapper.find('.c-pointer').trigger('click')

    expect(wrapper.text()).toContain('SCHINDLER, Margot')
  })

  it('shows the exact Legacy empty-state text when there are none', async () => {
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Monat wurden keine Log-Einträge gefunden.')
  })

  it('links each user to the per-user view with year/month/day from that day group', async () => {
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([
      makeDayGroup({ day: '2026-08-12', users: [{ id: 42, label: 'SCHINDLER, Margot' }] }),
    ])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()
    await wrapper.find('.c-pointer').trigger('click')

    const userLink = wrapper
      .findAllComponents(RouterLinkStub)
      .find((link) => link.props('to')?.name === 'administrator-request-logs-user')
    expect(userLink).toBeDefined()
    expect(userLink?.props('to')).toEqual({
      name: 'administrator-request-logs-user',
      params: { userId: 42 },
      query: { year: 2026, month: 8, day: 12 },
    })
  })

  it('renders one collapsible section per day group', async () => {
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([
      makeDayGroup({ day: '2026-08-12' }),
      makeDayGroup({ day: '2026-08-05' }),
    ])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()

    expect(wrapper.findAll('.c-pointer')).toHaveLength(2)
  })

  it('renders the nested user list as a striped table, 1:1 Legacy style', async () => {
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([
      makeDayGroup({
        users: [
          { id: 1, label: 'SCHINDLER, Margot' },
          { id: 2, label: 'AAAMSTETTER, Bernd' },
        ],
      }),
    ])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()
    await wrapper.find('.c-pointer').trigger('click')

    const table = wrapper.find('table')
    expect(table.classes()).toContain('table-striped')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })
})
