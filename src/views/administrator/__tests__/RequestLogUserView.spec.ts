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
  mockQuery = { year: '2026', month: '8' }
})

describe('RequestLogUserView', () => {
  it('loads and renders the username and requests for the given year/month', async () => {
    mockGetForUser.mockResolvedValueOnce(makeDetail([makeEntry()]))
    mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()

    expect(mockGetForUser).toHaveBeenCalledWith(7, 2026, 8)
  })

  it('renders the username and each entry method/path', async () => {
    mockGetForUser.mockResolvedValueOnce(
      makeDetail([makeEntry({ request_method: 'POST', request_path: '/auth/login' })]),
    )
    const wrapper = mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()
    await wrapper.find('.c-pointer').trigger('click')

    expect(wrapper.text()).toContain('SCHINDLER, Margot')
    expect(wrapper.text()).toContain('POST')
    expect(wrapper.text()).toContain('/auth/login')
  })

  it('groups entries by calendar day', async () => {
    mockGetForUser.mockResolvedValueOnce(
      makeDetail([
        makeEntry({ id: 1, created_at: '2026-08-12T09:00:00+00:00' }),
        makeEntry({ id: 2, created_at: '2026-08-12T15:00:00+00:00' }),
        makeEntry({ id: 3, created_at: '2026-08-13T09:00:00+00:00' }),
      ]),
    )
    const wrapper = mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()

    expect(wrapper.findAll('.c-pointer')).toHaveLength(2)
  })

  it("starts every day group collapsed, 1:1 Legacy's <toggler> default", async () => {
    mockGetForUser.mockResolvedValueOnce(makeDetail([makeEntry({ request_method: 'POST' })]))
    const wrapper = mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('POST')

    await wrapper.find('.c-pointer').trigger('click')

    expect(wrapper.text()).toContain('POST')
  })

  it('shows the exact Legacy empty-state text when there are none', async () => {
    mockGetForUser.mockResolvedValueOnce(makeDetail([]))
    const wrapper = mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Monat wurden keine Log-Einträge gefunden.')
  })

  it('links each entry to Show and "zurück" to Index with the same year/month', async () => {
    mockGetForUser.mockResolvedValueOnce(makeDetail([makeEntry({ id: 99 })]))
    const wrapper = mount(RequestLogUserView, { props: { userId: '7' } })
    await flushPromises()
    await wrapper.find('.c-pointer').trigger('click')

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
        query: { year: 2026, month: 8 },
      })
    }
  })
})
