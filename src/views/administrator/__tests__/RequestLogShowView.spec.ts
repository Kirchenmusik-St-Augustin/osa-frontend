import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import RequestLogShowView from '../RequestLogShowView.vue'
import type { RequestLogShow } from '@/composables/useRequestLogs'

const mockGet = vi.fn()
vi.mock('@/composables/useRequestLogs', () => ({
  useRequestLogs: () => ({ get: mockGet }),
}))

function makeEntry(overrides: Partial<RequestLogShow> = {}): RequestLogShow {
  return {
    id: 1,
    client_ip: '203.0.113.1',
    client_ips: ['203.0.113.1', '198.51.100.1'],
    client_user_agent_string: 'pytest-agent/1.0',
    user_id: 7,
    user_name: 'SCHINDLER, Margot',
    request_method: 'POST',
    request_path: '/auth/login',
    request_input: { username: 'margot@example.test', password: '__removed__' },
    response_status: 200,
    response_content: { access_token: '__removed__', token_type: 'bearer' },
    memory_usage: 4096,
    created_at: '2026-08-12T09:05:03+00:00',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RequestLogShowView', () => {
  it('loads and renders all LogDetail fields', async () => {
    mockGet.mockResolvedValueOnce(makeEntry())
    const wrapper = mount(RequestLogShowView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('SCHINDLER, Margot (ID: 7)')
    expect(wrapper.text()).toContain('203.0.113.1 (203.0.113.1 / 198.51.100.1)')
    expect(wrapper.text()).toContain('pytest-agent/1.0')
    expect(wrapper.text()).toContain('POST')
    expect(wrapper.text()).toContain('/auth/login')
    expect(wrapper.text()).toContain('200')
    expect(wrapper.text()).toContain('4096 Bytes')
  })

  it('renders request/response JSON via JsonBlock, already redacted', async () => {
    mockGet.mockResolvedValueOnce(makeEntry())
    const wrapper = mount(RequestLogShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('__removed__')
    expect(wrapper.findAll('pre')).toHaveLength(2)
  })

  it('shows an empty array for a null response body, 1:1 Legacy\'s "?? []" fallback', async () => {
    mockGet.mockResolvedValueOnce(makeEntry({ response_content: null }))
    const wrapper = mount(RequestLogShowView, { props: { id: '1' } })
    await flushPromises()

    const preBlocks = wrapper.findAll('pre')
    expect(preBlocks[1]?.text()).toBe('[]')
  })

  it('links "zurück" to the per-user view for the entry\'s own day', async () => {
    mockGet.mockResolvedValueOnce(
      makeEntry({ user_id: 7, created_at: '2026-03-15T09:00:00+00:00' }),
    )
    const wrapper = mount(RequestLogShowView, { props: { id: '1' } })
    await flushPromises()

    const backLink = wrapper.findComponent(RouterLinkStub)
    expect(backLink.props('to')).toEqual({
      name: 'administrator-request-logs-user',
      params: { userId: 7 },
      query: { year: 2026, month: 3, day: 15 },
    })
  })

  it('links "zurück" to the Index when the entry has no user (guest request)', async () => {
    mockGet.mockResolvedValueOnce(makeEntry({ user_id: null, user_name: null }))
    const wrapper = mount(RequestLogShowView, { props: { id: '1' } })
    await flushPromises()

    const backLink = wrapper.findComponent(RouterLinkStub)
    expect(backLink.props('to')).toEqual({ name: 'administrator-request-logs-index' })
  })

  it('shows "zurück" as a primary button both above and below the fields, 1:1 Legacy', async () => {
    mockGet.mockResolvedValueOnce(makeEntry())
    const wrapper = mount(RequestLogShowView, { props: { id: '1' } })
    await flushPromises()

    const backLinks = wrapper.findAllComponents(RouterLinkStub)
    expect(backLinks).toHaveLength(2)
    for (const backLink of backLinks) {
      expect(backLink.classes()).toContain('btn-primary')
    }
  })

  it("renders each field label on its own line above the value, 1:1 Legacy's LogDetail", async () => {
    mockGet.mockResolvedValueOnce(makeEntry())
    const wrapper = mount(RequestLogShowView, { props: { id: '1' } })
    await flushPromises()

    const label = wrapper.findAll('.fw-bold').find((el) => el.text() === 'Zeitpunkt:')
    expect(label?.element.tagName).toBe('DIV')
    expect(label?.element.nextElementSibling?.classList.contains('ps-2')).toBe(true)
  })
})
