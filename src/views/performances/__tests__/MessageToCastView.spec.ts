import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
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

let mockKillSwitchActive = false
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: () => false,
    user: { email_kill_switch: { active: mockKillSwitchActive, period_days: 30, threshold: 100 } },
  }),
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
    phone: '0664123456',
  },
  { id: 6, surname: 'MAYER', givenname: 'Anna', has_email: false, email: null, phone: null },
]

function rowCheckbox(wrapper: ReturnType<typeof mount>, index: number) {
  return wrapper.findAll('tbody tr')[index]!.find('input[type="checkbox"]')
}

beforeEach(() => {
  vi.resetAllMocks()
  mockConfirmAction.mockResolvedValue(true)
  mockKillSwitchActive = false
})

describe('MessageToCastView', () => {
  it('fetches the page and the "all" recipients on mount, rendering the Nachname/Vorname/E-Mail/Telefon table', async () => {
    // Legacy's ListUsergroupComponent/SelectorComponent default the ability
    // dropdown to "alle" and fetch immediately on mount -- no manual
    // selection required to see the full cast.
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGetMessageToCastPage).toHaveBeenCalledWith(1)
    expect(mockGetMessageRecipients).toHaveBeenCalledWith(1, null, null)
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('HUBER')
    expect(rows[0]?.find('input[type="checkbox"]').attributes('disabled')).toBeUndefined()
    // MAYER has no email -- her switch is disabled, matching Legacy's
    // `input(disabled, v-else)` for exactly this case.
    expect(rows[1]?.text()).toContain('MAYER')
    expect(rows[1]?.find('input[type="checkbox"]').attributes('disabled')).toBeDefined()
  })

  it('renders clickable mailto:/tel: links for a recipient with an email and phone number', async () => {
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    const row = wrapper.findAll('tbody tr')[0]!
    expect(row.find('a[href="mailto:huber@example.com"]').text()).toBe('huber@example.com')
    expect(row.find('a[href="tel:0664123456"]').text()).toBe('0664123456')
  })

  it('renders the ability dropdown with one optgroup per position type', async () => {
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    const optgroup = wrapper.find('optgroup')
    expect(optgroup.attributes('label')).toBe('Instrumente')
    expect(optgroup.find('option').text()).toBe('Fagott')
  })

  it('refetches recipients scoped to the selected position when the ability dropdown changes', async () => {
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    mockGetMessageRecipients.mockResolvedValueOnce([recipients[0]!])
    await wrapper.find('select').setValue('instruments@10')
    await flushPromises()

    expect(mockGetMessageRecipients).toHaveBeenLastCalledWith(1, 'instruments', 10)
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  it('clears the recipient table when the blank ability option is selected', async () => {
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('select').setValue('none')
    await flushPromises()

    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('the "alle (N)" switch selects every recipient with an email, counted by eligibility not total headcount', async () => {
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    // 2 recipients total, only 1 (HUBER) has an email.
    expect(wrapper.text()).toContain('alle (1)')

    await wrapper.find('#message-to-cast-check-all').setValue(true)

    expect((rowCheckbox(wrapper, 0).element as HTMLInputElement).checked).toBe(true)
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

    await rowCheckbox(wrapper, 0).setValue(true)
    await wrapper.find('textarea').setValue('Bitte pünktlich erscheinen.')

    expect(sendButton?.attributes('disabled')).toBeUndefined()
  })

  it('sends the message on confirm -- the actual bugfix regression test (Legacy: dead 405 route)', async () => {
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    mockSendMessageToCast.mockResolvedValueOnce(undefined)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    await rowCheckbox(wrapper, 0).setValue(true)
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

    await rowCheckbox(wrapper, 0).setValue(true)
    await wrapper.find('textarea').setValue('Test')
    const sendButton = wrapper.findAll('button').find((button) => button.text() === 'Senden')
    await sendButton?.trigger('click')
    await flushPromises()

    expect(mockSendMessageToCast).not.toHaveBeenCalled()
  })

  it('only visually hides the "Mailing-Liste in Zwischenablage kopieren" links until a recipient is selected, keeping their line height reserved', async () => {
    // Same pattern as CastView's/CastItem's reset links: Legacy-style
    // v-if would collapse the row and make the page jump once a recipient
    // gets selected -- `.invisible` (visibility:hidden, space kept) avoids
    // that instead. Rendered twice (above and below the table), matching
    // Legacy's ListUsergroupComponent doubling its ClipboardComponent.
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    const copyLinkText = 'Mailing-Liste in Zwischenablage kopieren'
    const findCopyLinks = () => wrapper.findAll('div').filter((div) => div.text() === copyLinkText)
    expect(findCopyLinks()).toHaveLength(2)
    for (const link of findCopyLinks()) {
      expect(link.classes()).toContain('invisible')
    }

    await rowCheckbox(wrapper, 0).setValue(true)

    const copyLinks = findCopyLinks()
    expect(copyLinks).toHaveLength(2)
    for (const link of copyLinks) {
      expect(link.classes()).not.toContain('invisible')
    }
    await copyLinks[0]!.trigger('click')

    expect(writeText).toHaveBeenCalledWith('huber@example.com')
    expect(mockShowToast).toHaveBeenCalledWith('Mailing-Liste in Zwischenablage kopiert.')
  })

  it('replaces the message-textarea+Senden block with the kill-switch card while active, keeping the recipient table visible', async () => {
    mockKillSwitchActive = true
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.findAll('button').some((button) => button.text() === 'Senden')).toBe(false)
    expect(wrapper.text()).toContain('Email-Versand aktuell deaktiviert')
    // The recipient dropdown/table itself stays visible -- only the
    // message-composition block is swapped out (verified against Legacy's
    // MessageToContactperson.vue, see EmailThresholdWarning.vue docstring).
    expect(wrapper.find('table').exists()).toBe(true)
  })

  it('both "zurück" links (above and below the form) go to the calendar month of the performance, not its show page', async () => {
    // Legacy's MessageToCast.vue renders "zurück" TWICE (before and after
    // the recipient form) and links both to
    // `route('...performances.index', { year, month })` (the calendar),
    // never to the performance's own show/detail page.
    mockGetMessageToCastPage.mockResolvedValueOnce(makePage())
    mockGetMessageRecipients.mockResolvedValueOnce(recipients)
    const wrapper = mount(MessageToCastView, { props: { id: '1' } })
    await flushPromises()

    const backLinks = wrapper.findAllComponents(RouterLinkStub)
    expect(backLinks).toHaveLength(2)
    for (const link of backLinks) {
      expect(link.props('to')).toEqual({ name: 'home', query: { year: 2026, month: 8 } })
    }
  })
})
