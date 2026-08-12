import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import RequestLogUserView from '../RequestLogUserView.vue'
import type { RequestLogEntry, RequestLogUserDetail } from '@/composables/useRequestLogs'

let mockQuery: Record<string, string> = {}
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRoute: () => ({ query: mockQuery }),
}))

const mockGetForUser = vi.fn()
vi.mock('@/composables/useRequestLogs', () => ({
  useRequestLogs: () => ({ getForUser: mockGetForUser }),
}))

function makeEntry(overrides: Partial<RequestLogEntry> = {}): RequestLogEntry {
  return {
    id: 1,
    created_at: '2026-08-12T09:05:03+00:00',
    request_method: 'GET',
    request_path: '/some/path',
    ...overrides,
  }
}

function makeDetail(entries: RequestLogEntry[]): RequestLogUserDetail {
  return { username: 'SCHINDLER, Margot', entries }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockQuery = { year: '2026', month: '8', day: '12' }
})

describe('RequestLogUserView', () => {
  it('loads and renders the username and requests for the given year/month/day', async () => {
    mockGetForUser.mockResolvedValueOnce(makeDetail([makeEntry()]))
    mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()

    expect(mockGetForUser).toHaveBeenCalledWith(7, 2026, 8, 12)
  })

  it('renders the username and each entry method/path directly, no collapsible grouping', async () => {
    mockGetForUser.mockResolvedValueOnce(
      makeDetail([makeEntry({ request_method: 'POST', request_path: '/auth/login' })]),
    )
    const wrapper = mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()

    expect(wrapper.text()).toContain('SCHINDLER, Margot')
    expect(wrapper.text()).toContain('POST')
    expect(wrapper.text()).toContain('/auth/login')
    expect(wrapper.find('.c-pointer').exists()).toBe(false)
  })

  it('renders each entry as its own table row (all entries already belong to one day)', async () => {
    mockGetForUser.mockResolvedValueOnce(
      makeDetail([makeEntry({ id: 1 }), makeEntry({ id: 2 }), makeEntry({ id: 3 })]),
    )
    const wrapper = mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()

    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })

  it('shows the exact empty-state text when there are none', async () => {
    mockGetForUser.mockResolvedValueOnce(makeDetail([]))
    const wrapper = mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Tag wurden keine Log-Einträge gefunden.')
  })

  it('links each entry to Show and "zurück" to Index with the same year/month/day', async () => {
    mockGetForUser.mockResolvedValueOnce(makeDetail([makeEntry({ id: 99 })]))
    const wrapper = mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()

    const links = wrapper.findAllComponents(RouterLinkStub)
    const showLink = links.find(
      (link) => link.props('to')?.name === 'administrator-request-logs-show',
    )
    expect(showLink?.props('to')).toEqual({
      name: 'administrator-request-logs-show',
      params: { id: 99 },
    })

    // Legacy shows the "zurück" button both above and below the log list.
    const backLinks = links.filter(
      (link) => link.props('to')?.name === 'administrator-request-logs-index',
    )
    expect(backLinks).toHaveLength(2)
    for (const backLink of backLinks) {
      expect(backLink.props('to')).toEqual({
        name: 'administrator-request-logs-index',
        query: { year: 2026, month: 8, day: 12 },
      })
    }
  })

  it('reloads the entries when the userId prop changes, without remounting', async () => {
    // Regression guard for the onMounted -> watch fix: Vue Router recycles
    // this component instance on a pure :userId change -- onMounted() alone
    // would only fire once. Same precedent/technique as CoreelementView.vue's
    // "reloads the list when the type prop changes" test.
    mockGetForUser.mockResolvedValueOnce(makeDetail([makeEntry({ id: 1 })]))
    const wrapper = mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()
    expect(mockGetForUser).toHaveBeenCalledWith(7, 2026, 8, 12)

    mockGetForUser.mockResolvedValueOnce(makeDetail([makeEntry({ id: 2 })]))
    await wrapper.setProps({ userId: '8' })
    await flushPromises()

    expect(mockGetForUser).toHaveBeenCalledWith(8, 2026, 8, 12)
  })
})
