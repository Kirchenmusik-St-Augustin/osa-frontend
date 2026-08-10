import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MessageToContactpersonView from '../MessageToContactpersonView.vue'
import type { RoleWithContacts } from '@/composables/useSupport'

const mockGetContactpersons = vi.fn()
const mockSendMessageToContactperson = vi.fn()
vi.mock('@/composables/useSupport', () => ({
  useSupport: () => ({
    getContactpersons: mockGetContactpersons,
    sendMessageToContactperson: mockSendMessageToContactperson,
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
    user: { email_kill_switch: { active: mockKillSwitchActive, period_days: 30, threshold: 100 } },
  }),
}))

function makeRoles(): RoleWithContacts[] {
  return [
    {
      id: 1,
      name: 'planner',
      label: 'Planung',
      description: 'Plant den Dienstplan.',
      users: [
        { id: 5, givenname: 'Franz', surname: 'HUBER', has_email: true },
        { id: 6, givenname: 'Anna', surname: 'MAYER', has_email: false },
      ],
    },
    {
      id: 2,
      name: 'billing',
      label: 'Abrechnung',
      description: 'Erstellt die Gagenabrechnung.',
      users: [],
    },
  ]
}

beforeEach(() => {
  vi.resetAllMocks()
  mockConfirmAction.mockResolvedValue(true)
  mockKillSwitchActive = false
})

describe('MessageToContactpersonView', () => {
  it('renders one optgroup per role with contacts as options', async () => {
    mockGetContactpersons.mockResolvedValueOnce(makeRoles())
    const wrapper = mount(MessageToContactpersonView)
    await flushPromises()

    const optgroups = wrapper.findAll('optgroup')
    expect(optgroups).toHaveLength(2)
    expect(optgroups[0]?.attributes('label')).toBe('Planung')
    expect(optgroups[0]?.text()).toContain('HUBER, Franz')
  })

  it('disables the option and appends the hint for a contact without a verified email', async () => {
    mockGetContactpersons.mockResolvedValueOnce(makeRoles())
    const wrapper = mount(MessageToContactpersonView)
    await flushPromises()

    const options = wrapper.findAll('option')
    const mayerOption = options.find((option) => option.text().includes('MAYER'))
    expect(mayerOption?.attributes('disabled')).toBeDefined()
    expect(mayerOption?.text()).toContain('(keine E-Mail-Adresse bekannt)')
  })

  it('renders a role-description card per role, fed from role.description', async () => {
    mockGetContactpersons.mockResolvedValueOnce(makeRoles())
    const wrapper = mount(MessageToContactpersonView)
    await flushPromises()

    expect(wrapper.text()).toContain('Rolle: Planung')
    expect(wrapper.text()).toContain('Plant den Dienstplan.')
    expect(wrapper.text()).toContain('Rolle: Abrechnung')
    expect(wrapper.text()).toContain('Erstellt die Gagenabrechnung.')
  })

  it('disables send until a recipient is selected and a message of at least 3 chars is entered', async () => {
    mockGetContactpersons.mockResolvedValueOnce(makeRoles())
    const wrapper = mount(MessageToContactpersonView)
    await flushPromises()

    const sendButton = wrapper.findAll('button').find((button) => button.text() === 'senden')
    expect(sendButton?.attributes('disabled')).toBeDefined()

    await wrapper.find('select').setValue('5')
    await wrapper.find('textarea').setValue('Hi')
    expect(sendButton?.attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue('Hallo!')
    expect(sendButton?.attributes('disabled')).toBeUndefined()
  })

  it('sends the message on confirm and resets the textarea afterward', async () => {
    mockGetContactpersons.mockResolvedValueOnce(makeRoles())
    mockSendMessageToContactperson.mockResolvedValueOnce(undefined)
    const wrapper = mount(MessageToContactpersonView)
    await flushPromises()

    await wrapper.find('select').setValue('5')
    await wrapper.find('textarea').setValue('Bitte um Rückruf.')
    const sendButton = wrapper.findAll('button').find((button) => button.text() === 'senden')
    await sendButton?.trigger('click')
    await flushPromises()

    expect(mockSendMessageToContactperson).toHaveBeenCalledWith(5, 'Bitte um Rückruf.')
    expect(mockShowToast).toHaveBeenCalledWith('Nachricht versandt.')
    expect(wrapper.find('textarea').element.value).toBe('')
  })

  it('does not send when the confirmation dialog is declined', async () => {
    mockGetContactpersons.mockResolvedValueOnce(makeRoles())
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(MessageToContactpersonView)
    await flushPromises()

    await wrapper.find('select').setValue('5')
    await wrapper.find('textarea').setValue('Bitte um Rückruf.')
    const sendButton = wrapper.findAll('button').find((button) => button.text() === 'senden')
    await sendButton?.trigger('click')
    await flushPromises()

    expect(mockSendMessageToContactperson).not.toHaveBeenCalled()
  })

  it("shows the exact (typo'd) Legacy error message on a failed send", async () => {
    mockGetContactpersons.mockResolvedValueOnce(makeRoles())
    mockSendMessageToContactperson.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount(MessageToContactpersonView)
    await flushPromises()

    await wrapper.find('select').setValue('5')
    await wrapper.find('textarea').setValue('Bitte um Rückruf.')
    const sendButton = wrapper.findAll('button').find((button) => button.text() === 'senden')
    await sendButton?.trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Nachricht konnte nicht versanct werden.', true)
  })

  it('replaces the message-textarea+senden block with the kill-switch card while active, keeping the dropdown and description cards visible', async () => {
    mockKillSwitchActive = true
    mockGetContactpersons.mockResolvedValueOnce(makeRoles())
    const wrapper = mount(MessageToContactpersonView)
    await flushPromises()

    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.findAll('button').some((button) => button.text() === 'senden')).toBe(false)
    expect(wrapper.text()).toContain('Email-Versand aktuell deaktiviert')
    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.text()).toContain('Rollenbeschreibungen')
  })
})
