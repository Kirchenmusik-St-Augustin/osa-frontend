import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EmailThresholdWarning from '../EmailThresholdWarning.vue'
import type { EmailKillSwitchStatus } from '@/stores/auth'

let mockKillSwitch: EmailKillSwitchStatus | undefined

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get user() {
      return mockKillSwitch ? { email_kill_switch: mockKillSwitch } : null
    },
  }),
}))

beforeEach(() => {
  mockKillSwitch = undefined
})

describe('EmailThresholdWarning', () => {
  describe('variant="icon" (default)', () => {
    it('renders nothing while the kill switch is inactive', () => {
      mockKillSwitch = { active: false, period_days: 30, threshold: 950 }
      const wrapper = mount(EmailThresholdWarning)

      expect(wrapper.find('i').exists()).toBe(false)
    })

    it('renders the warning triangle while the kill switch is active', () => {
      mockKillSwitch = { active: true, period_days: 30, threshold: 950 }
      const wrapper = mount(EmailThresholdWarning)

      const icon = wrapper.find('i')
      expect(icon.exists()).toBe(true)
      expect(icon.classes()).toContain('fa-triangle-exclamation')
      expect(icon.classes()).toContain('text-warning')
    })

    it('renders nothing when the user is not loaded yet', () => {
      mockKillSwitch = undefined
      const wrapper = mount(EmailThresholdWarning)

      expect(wrapper.find('i').exists()).toBe(false)
    })
  })

  describe('variant="card"', () => {
    it('renders nothing while the kill switch is inactive', () => {
      mockKillSwitch = { active: false, period_days: 30, threshold: 950 }
      const wrapper = mount(EmailThresholdWarning, { props: { variant: 'card' } })

      expect(wrapper.find('.card').exists()).toBe(false)
    })

    it('renders the 1:1 Legacy warning card with the real threshold values', () => {
      mockKillSwitch = { active: true, period_days: 30, threshold: 950 }
      const wrapper = mount(EmailThresholdWarning, { props: { variant: 'card' } })

      expect(wrapper.find('.card-header').text()).toContain('Email-Versand aktuell deaktiviert')
      const body = wrapper.find('.card-body').text()
      expect(body).toContain('Derzeit werden keine Emails aus dem System versandt!')
      expect(body).toContain('30-Tage-Grenzwert von 950 Emails erreicht ist.')
    })
  })
})
