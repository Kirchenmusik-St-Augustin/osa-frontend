import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import SentEmailShowView from '../SentEmailShowView.vue'
import type { SentEmailShow } from '@/composables/useSentEmails'

const mockGet = vi.fn()
vi.mock('@/composables/useSentEmails', () => ({
  useSentEmails: () => ({ get: mockGet }),
}))

function makeEmail(overrides: Partial<SentEmailShow> = {}): SentEmailShow {
  return {
    id: 1,
    mailer: 'smtp',
    datetime: '2026-08-02T11:00:00+00:00',
    from: 'noreply@example.test',
    to: 'empfaenger@example.test',
    cc: null,
    bcc: null,
    subject: 'Betreff-Text',
    body: '<p>Hallo</p>',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SentEmailShowView', () => {
  it('loads and renders the email fields', async () => {
    mockGet.mockResolvedValueOnce(makeEmail())
    const wrapper = mount(SentEmailShowView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('noreply@example.test')
    expect(wrapper.text()).toContain('empfaenger@example.test')
    expect(wrapper.text()).toContain('Betreff-Text')
  })

  it('shows a green mailer tag for a real smtp send', async () => {
    mockGet.mockResolvedValueOnce(makeEmail({ mailer: 'smtp' }))
    const wrapper = mount(SentEmailShowView, { props: { id: '1' } })
    await flushPromises()

    const tag = wrapper.find('span.fw-bold.p-1.rounded.text-light')
    expect(tag.classes()).toContain('bg-success')
    expect(tag.text()).toBe('smtp')
  })

  it('shows a red mailer tag when the kill-switch had diverted the mail to logging', async () => {
    mockGet.mockResolvedValueOnce(makeEmail({ mailer: 'log' }))
    const wrapper = mount(SentEmailShowView, { props: { id: '1' } })
    await flushPromises()

    const tag = wrapper.find('span.fw-bold.p-1.rounded.text-light')
    expect(tag.classes()).toContain('bg-danger')
  })

  it('hides CC/BCC when unset, shows them when set', async () => {
    mockGet.mockResolvedValueOnce(makeEmail({ cc: null, bcc: null }))
    const wrapper = mount(SentEmailShowView, { props: { id: '1' } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('CC:')
    expect(wrapper.text()).not.toContain('BCC:')

    mockGet.mockResolvedValueOnce(makeEmail({ cc: 'cc@example.test', bcc: 'bcc@example.test' }))
    const wrapperWithCcBcc = mount(SentEmailShowView, { props: { id: '1' } })
    await flushPromises()
    expect(wrapperWithCcBcc.text()).toContain('cc@example.test')
    expect(wrapperWithCcBcc.text()).toContain('bcc@example.test')
  })

  it('renders the message body in an iframe via srcdoc with only a top border, 1:1 Legacy', async () => {
    mockGet.mockResolvedValueOnce(makeEmail({ body: '<p>Hallo Welt</p>' }))
    const wrapper = mount(SentEmailShowView, { props: { id: '1' } })
    await flushPromises()

    const iframe = wrapper.find('iframe')
    expect(iframe.attributes('srcdoc')).toBe('<p>Hallo Welt</p>')
    expect(iframe.classes()).toEqual(['border-top'])
    expect(iframe.attributes('width')).toBe('100%')
    expect(iframe.attributes('height')).toBe('1000px')
  })

  it('lays out each field as a label/value grid row (col-md-2/col-md-10), 1:1 Legacy', async () => {
    mockGet.mockResolvedValueOnce(makeEmail())
    const wrapper = mount(SentEmailShowView, { props: { id: '1' } })
    await flushPromises()

    const labels = wrapper.findAll('.col-md-2.fw-bold').map((label) => label.text())
    expect(labels).toContain('Zeitpunkt:')
    expect(labels).toContain('Von:')
    expect(labels).toContain('Via:')
  })

  it('links "zurück" to the Index for the email\'s own month, not the current month', async () => {
    mockGet.mockResolvedValueOnce(makeEmail({ datetime: '2026-03-15T11:00:00+00:00' }))
    const wrapper = mount(SentEmailShowView, { props: { id: '1' } })
    await flushPromises()

    const backLink = wrapper.findComponent(RouterLinkStub)
    expect(backLink.props('to')).toEqual({
      name: 'administrator-sent-emails-index',
      query: { year: 2026, month: 3 },
    })
  })
})
