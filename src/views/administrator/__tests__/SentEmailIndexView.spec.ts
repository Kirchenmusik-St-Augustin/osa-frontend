import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SentEmailIndexView from '../SentEmailIndexView.vue'
import type { SentEmailShort } from '@/composables/useSentEmails'

let mockQuery: Record<string, string> = {}
const mockPush = vi.fn()
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRoute: () => ({ query: mockQuery }),
  useRouter: () => ({ push: mockPush }),
}))

const mockListForMonth = vi.fn()
vi.mock('@/composables/useSentEmails', () => ({
  useSentEmails: () => ({ listForMonth: mockListForMonth }),
}))

function makeEmail(overrides: Partial<SentEmailShort> = {}): SentEmailShort {
  return {
    id: 1,
    datetime: '2026-08-02T11:00:00+00:00',
    to: 'empfaenger@example.test',
    subject: 'Betreff-Text',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockQuery = { year: '2026', month: '8' }
})

describe('SentEmailIndexView', () => {
  it('loads and lists the sent emails for the requested month', async () => {
    mockListForMonth.mockResolvedValueOnce([makeEmail()])
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()

    expect(mockListForMonth).toHaveBeenCalledWith(2026, 8)
    expect(wrapper.text()).toContain('empfaenger@example.test')
    expect(wrapper.text()).toContain('Betreff-Text')
  })

  it('shows the exact Legacy empty-state text when there are none', async () => {
    mockListForMonth.mockResolvedValueOnce([])
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Monat wurden keine versandten Emails gefunden.')
  })

  it('navigates to Show when a row is clicked', async () => {
    mockListForMonth.mockResolvedValueOnce([makeEmail({ id: 42 })])
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()

    await wrapper.find('tbody tr').trigger('click')

    expect(mockPush).toHaveBeenCalledWith({
      name: 'administrator-sent-emails-show',
      params: { id: 42 },
    })
  })

  it('renders a full-width striped table (no table-sm, no column wrapper), 1:1 Legacy', async () => {
    mockListForMonth.mockResolvedValueOnce([makeEmail()])
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()

    const table = wrapper.find('table')
    expect(table.classes()).toContain('table-striped')
    expect(table.classes()).not.toContain('table-sm')
    expect(wrapper.find('.col-md-8').exists()).toBe(false)
  })
})
