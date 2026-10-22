import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import RequestLogIndexView from '../RequestLogIndexView.vue'
import type { RequestLogDayGroup } from '@/composables/useRequestLogs'
import { testId } from '@/__tests__/testId'
import { linkTarget } from '@/__tests__/linkTarget'

let mockQuery = reactive<Record<string, string>>({})
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRoute: () => ({ query: mockQuery }),
}))

const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

const mockListDaysWithUsersForMonth = vi.fn()
vi.mock('@/composables/useRequestLogs', () => ({
  useRequestLogs: () => ({ listDaysWithUsersForMonth: mockListDaysWithUsersForMonth }),
}))

function makeDayGroup(overrides: Partial<RequestLogDayGroup> = {}): RequestLogDayGroup {
  return {
    day: '2026-08-12',
    users: [{ id: testId(1), label: 'SCHINDLER, Margot' }],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockQuery = reactive({ year: '2026', month: '8' })
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

  it('shows the empty-state text when there are none', async () => {
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Monat wurden keine Log-Einträge gefunden.')
  })

  it('links each user to the per-user view with year/month/day from that day group', async () => {
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([
      makeDayGroup({ day: '2026-08-12', users: [{ id: testId(42), label: 'SCHINDLER, Margot' }] }),
    ])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()
    await wrapper.find('.c-pointer').trigger('click')

    const userLink = wrapper
      .findAllComponents(RouterLinkStub)
      .find((link) => linkTarget(link)?.name === 'administrator-request-logs-user')
    expect(userLink).toBeDefined()
    expect(userLink?.props('to')).toEqual({
      name: 'administrator-request-logs-user',
      params: { userId: testId(42) },
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

  it('renders the nested user list as a striped table', async () => {
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([
      makeDayGroup({
        users: [
          { id: testId(1), label: 'SCHINDLER, Margot' },
          { id: testId(2), label: 'AAAMSTETTER, Bernd' },
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

  it('drops a late answer for a month that is no longer shown', async () => {
    let finishFirst: (value: unknown) => void = () => {}
    mockListDaysWithUsersForMonth.mockReturnValueOnce(
      new Promise((resolve) => {
        finishFirst = resolve
      }),
    )
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([makeDayGroup({ day: '2026-09-03' })])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()
    mockQuery['month'] = '9'
    await flushPromises()

    finishFirst([makeDayGroup({ day: '2026-08-12' })])
    await flushPromises()

    expect(wrapper.text()).toContain('3. September 2026')
    expect(wrapper.text()).not.toContain('12. August 2026')
  })

  it('does not claim that nothing was found when the load fails', async () => {
    mockListDaysWithUsersForMonth.mockRejectedValueOnce(new Error('network'))
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein unerwarteter Fehler ist aufgetreten.', true)
    expect(wrapper.text()).not.toContain('Für diesen Monat wurden keine Log-Einträge gefunden.')
  })

  it('shows neither the previous data nor the empty text after a later load fails', async () => {
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([makeDayGroup({ day: '2026-08-12' })])
    mockListDaysWithUsersForMonth.mockRejectedValueOnce(new Error('network'))
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()
    expect(wrapper.text()).toContain('12. August 2026')
    mockQuery['month'] = '9'
    await flushPromises()

    expect(wrapper.text()).not.toContain('12. August 2026')
    expect(wrapper.text()).not.toContain('Für diesen Monat wurden keine Log-Einträge gefunden.')
  })

  it('shows the empty text again once a later load succeeds with nothing', async () => {
    mockListDaysWithUsersForMonth.mockRejectedValueOnce(new Error('network'))
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()
    mockQuery['month'] = '9'
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Monat wurden keine Log-Einträge gefunden.')
  })

  it('ignores the failure of an older request once a newer one has been answered', async () => {
    let failFirst: (reason: unknown) => void = () => {}
    mockListDaysWithUsersForMonth.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        failFirst = reject
      }),
    )
    mockListDaysWithUsersForMonth.mockResolvedValueOnce([makeDayGroup({ day: '2026-09-03' })])
    const wrapper = mount(RequestLogIndexView)
    await flushPromises()
    mockQuery['month'] = '9'
    await flushPromises()

    failFirst(new Error('late failure'))
    await flushPromises()

    expect(mockShowToast).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('3. September 2026')
  })

  it('uses its own text when the load error carries no message of its own', async () => {
    mockListDaysWithUsersForMonth.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'x'], msg: 'Ungültig.' }] } },
    })
    mount(RequestLogIndexView)
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Das Logbuch konnte nicht geladen werden.', true)
  })
})
