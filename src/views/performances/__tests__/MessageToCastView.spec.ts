import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MessageToCastView from '../MessageToCastView.vue'
import type { MessageRecipient, PerformanceMessageToCast } from '@/composables/useBookings'

const mockGetMessageToCastPage = vi.fn()
const mockGetMessageRecipients = vi.fn()
const mockSendMessageToCast = vi.fn()
vi.mock('@/composables/useBookings', () => ({
  useBookings: () => ({
    getMessageToCastPage: mockGetMessageToCastPage,
    getMessageRecipients: mockGetMessageRecipients,
    sendMessageToCast: mockSendMessageToCast,
  }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ hasPermission: () => false }),
}))

function makePage(
  overrides: Partial<PerformanceMessageToCast['booked_cast']> = {},
): PerformanceMessageToCast {
  return {
    id: 1,
    ordinariumwork_name: 'Krönungsmesse',
    ordinariumwork_artist_name: 'MOZART, Wolfgang',
    artist_name: null,
    schedule: '2026-08-02T11:00:00',
    location: { id: 1, name: 'Augustinerkirche', color: '336699', address: null },
    user_booking: { status: 0, position: null, at: null },
    proprium: [],
    demanding_proprium: false,
    rehearsals: [],
    booked_cast: {
      instruments: [{ id: 10, name: 'Fagott', cast: [{ id: 5, name: 'HUBER, Franz', fee: 60 }] }],
      voices: [],
      choirjobs: [],
      ...overrides,
    },
  }
}

const recipients: MessageRecipient[] = [
  {
    id: 5,
    surname: 'HUBER',
    givenname: 'Franz',
    has_email: true,
    email: 'huber@example.com',
    phone: null,
  },
  { id: 6, surname: 'MAYER', givenname: 'Anna', has_email: false, email: null, phone: null },
]

beforeEach(() => {
  vi.resetAllMocks()
  mockConfirmAction.mockResolvedValue(true)
})

describe('MessageToCastView', () => {
  it('fetches the page and the "all" recipients on mount', async () => {
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGetMessageToCastPage).toHaveBeenCalledWith(1)
    expect(mockGetMessageRecipients).toHaveBeenCalledWith(1, null, null)
    expect(wrapper.text()).toContain('HUBER, Franz')
    expect(wrapper.text()).toContain('keine E-Mail')
  })

  it('shows a fallback message and no form when the performance has no bookings', async () => {
    mockGetMessageToCastPage.mockResolvedValueOnce(
      makePage({ instruments: [], voices: [], choirjobs: [] }),
    )
    mockGetMessageRecipients.mockResolvedValueOnce([])
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.text()).toContain('Zu dieser Aufführung gibt es aktuell keine Buchungen.')
  })

  it('disables send until a recipient is selected and a message is entered', async () => {
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    const sendButton = wrapper.findAll('button').find((button) => button.text() === 'Senden')
    expect(sendButton?.attributes('disabled')).toBeDefined()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('textarea').setValue('Bitte pünktlich erscheinen.')

    expect(sendButton?.attributes('disabled')).toBeUndefined()
  })

  it('sends the message on confirm -- the actual bugfix regression test (Legacy: dead 405 route)', async () => {
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    mockSendMessageToCast.mockResolvedValueOnce(undefined)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('textarea').setValue('Bitte pünktlich erscheinen.')
    const sendButton = wrapper.findAll('button').find((button) => button.text() === 'Senden')
    await sendButton?.trigger('click')
    await flushPromises()

    expect(mockSendMessageToCast).toHaveBeenCalledWith(1, [5], 'Bitte pünktlich erscheinen.')
    expect(mockShowToast).toHaveBeenCalledWith('Nachricht versandt.')
    expect(wrapper.find('textarea').element.value).toBe('')
  })

  it('does not send when the confirmation dialog is declined', async () => {
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('textarea').setValue('Test')
    const sendButton = wrapper.findAll('button').find((button) => button.text() === 'Senden')
    await sendButton?.trigger('click')
    await flushPromises()

    expect(mockSendMessageToCast).not.toHaveBeenCalled()
  })

  it("copies the selected recipients' emails to the clipboard, skipping those without one", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0]?.setValue(true)
    await checkboxes[1]?.setValue(true)
    const copyButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Empfänger kopieren')
    await copyButton?.trigger('click')

    expect(writeText).toHaveBeenCalledWith('huber@example.com')
  })
})
