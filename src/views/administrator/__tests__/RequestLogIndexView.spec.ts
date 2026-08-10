import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import RequestLogIndexView from '../RequestLogIndexView.vue'
import type { RequestLogUserSummary } from '@/composables/useRequestLogs'

let mockQuery: Record<string, string> = {}
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRoute: () => ({ query: mockQuery }),
}))

const mockListUsersForMonth = vi.fn()
vi.mock('@/composables/useRequestLogs', () => ({
  useRequestLogs: () => ({ listUsersForMonth: mockListUsersForMonth }),
}))

function makeUser(overrides: Partial<RequestLogUserSummary> = {}): RequestLogUserSummary {
  return { id: 1, label: 'SCHINDLER, Margot', ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockQuery = { year: '2026', month: '8' }
})

describe('RequestLogIndexView', () => {
  it('loads and lists the users with entries in the requested month', async () => {
    mockListUsersForMonth.mockResolvedValueOnce([makeUser()])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()

    expect(mockListUsersForMonth).toHaveBeenCalledWith(2026, 8)
    expect(wrapper.text()).toContain('SCHINDLER, Margot')
  })

  it('shows the exact Legacy empty-state text when there are none', async () => {
    mockListUsersForMonth.mockResolvedValueOnce([])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Monat wurden keine Log-Einträge gefunden.')
  })

  it('links each user to the per-user view with the current year/month', async () => {
    mockListUsersForMonth.mockResolvedValueOnce([makeUser({ id: 42 })])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()

    const userLink = wrapper
      .findAllComponents(RouterLinkStub)
      .find((link) => link.props('to')?.name === 'administrator-request-logs-user')
    expect(userLink).toBeDefined()
    expect(userLink?.props('to')).toEqual({
      name: 'administrator-request-logs-user',
      params: { userId: 42 },
      query: { year: 2026, month: 8 },
    })
  })

  it('renders the user list as a striped table, 1:1 Legacy (not plain centered links)', async () => {
    mockListUsersForMonth.mockResolvedValueOnce([makeUser({ id: 1 }), makeUser({ id: 2 })])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()

    const table = wrapper.find('table')
    expect(table.classes()).toContain('table-striped')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })
})
