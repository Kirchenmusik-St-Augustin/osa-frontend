import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import SentEmailIndexView from '../SentEmailIndexView.vue'
import type { SentEmailShort } from '@/composables/useSentEmails'
import { testId } from '@/__tests__/testId'
import { linkTarget } from '@/__tests__/linkTarget'

let mockQuery = reactive<Record<string, string>>({})
const mockPush = vi.fn()
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRoute: () => ({ query: mockQuery }),
  useRouter: () => ({ push: mockPush }),
}))

const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

const mockListForMonth = vi.fn()
vi.mock('@/composables/useSentEmails', () => ({
  useSentEmails: () => ({ listForMonth: mockListForMonth }),
}))

function makeEmail(overrides: Partial<SentEmailShort> = {}): SentEmailShort {
  return {
    id: testId(1),
    datetime: '2026-08-02T11:00:00+00:00',
    to: 'empfaenger@example.test',
    subject: 'Betreff-Text',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockQuery = reactive({ year: '2026', month: '8' })
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

  it('shows the empty-state text when there are none', async () => {
    mockListForMonth.mockResolvedValueOnce([])
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Monat wurden keine versandten Emails gefunden.')
  })

  it('offers a real link to the mail in the first column, without a second navigation', async () => {
    mockListForMonth.mockResolvedValueOnce([makeEmail({ id: testId(42) })])
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()

    const link = wrapper
      .findAllComponents(RouterLinkStub)
      .find((candidate) => linkTarget(candidate)?.name === 'administrator-sent-emails-show')
    expect(linkTarget(link)).toEqual({
      name: 'administrator-sent-emails-show',
      params: { id: testId(42) },
    })
    await link!.trigger('click')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('navigates to Show when a row is clicked', async () => {
    mockListForMonth.mockResolvedValueOnce([makeEmail({ id: testId(42) })])
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()

    await wrapper.find('tbody tr').trigger('click')

    expect(mockPush).toHaveBeenCalledWith({
      name: 'administrator-sent-emails-show',
      params: { id: testId(42) },
    })
  })

  it('renders a full-width striped table (no table-sm, no column wrapper)', async () => {
    mockListForMonth.mockResolvedValueOnce([makeEmail()])
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()

    const table = wrapper.find('table')
    expect(table.classes()).toContain('table-striped')
    expect(table.classes()).not.toContain('table-sm')
    expect(wrapper.find('.col-md-8').exists()).toBe(false)
  })

  it('drops a late answer for a month that is no longer shown', async () => {
    let finishFirst: (value: unknown) => void = () => {}
    mockListForMonth.mockReturnValueOnce(
      new Promise((resolve) => {
        finishFirst = resolve
      }),
    )
    mockListForMonth.mockResolvedValueOnce([makeEmail({ subject: 'Aus September' })])
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()
    mockQuery['month'] = '9'
    await flushPromises()

    finishFirst([makeEmail({ subject: 'Aus August' })])
    await flushPromises()

    expect(wrapper.text()).toContain('Aus September')
    expect(wrapper.text()).not.toContain('Aus August')
  })

  it('does not claim that nothing was found when the load fails', async () => {
    mockListForMonth.mockRejectedValueOnce(new Error('network'))
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein unerwarteter Fehler ist aufgetreten.', true)
    expect(wrapper.text()).not.toContain(
      'Für diesen Monat wurden keine versandten Emails gefunden.',
    )
  })

  it('shows neither the previous data nor the empty text after a later load fails', async () => {
    mockListForMonth.mockResolvedValueOnce([makeEmail({ subject: 'Aus August' })])
    mockListForMonth.mockRejectedValueOnce(new Error('network'))
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()
    expect(wrapper.text()).toContain('Aus August')
    mockQuery['month'] = '9'
    await flushPromises()

    expect(wrapper.text()).not.toContain('Aus August')
    expect(wrapper.text()).not.toContain(
      'Für diesen Monat wurden keine versandten Emails gefunden.',
    )
  })

  it('shows the empty text again once a later load succeeds with nothing', async () => {
    mockListForMonth.mockRejectedValueOnce(new Error('network'))
    mockListForMonth.mockResolvedValueOnce([])
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()
    mockQuery['month'] = '9'
    await flushPromises()

    expect(wrapper.text()).toContain('Für diesen Monat wurden keine versandten Emails gefunden.')
  })

  it('ignores the failure of an older request once a newer one has been answered', async () => {
    let failFirst: (reason: unknown) => void = () => {}
    mockListForMonth.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        failFirst = reject
      }),
    )
    mockListForMonth.mockResolvedValueOnce([makeEmail({ subject: 'Aus September' })])
    const wrapper = mount(SentEmailIndexView)
    await flushPromises()
    mockQuery['month'] = '9'
    await flushPromises()

    failFirst(new Error('late failure'))
    await flushPromises()

    expect(mockShowToast).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Aus September')
  })

  it('uses its own text when the load error carries no message of its own', async () => {
    mockListForMonth.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'x'], msg: 'Ungültig.' }] } },
    })
    mount(SentEmailIndexView)
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Die Emails konnten nicht geladen werden.', true)
  })
})
