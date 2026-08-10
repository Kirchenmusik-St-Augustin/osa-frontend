import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import StatisticsView from '../StatisticsView.vue'
import type { Statistics } from '@/composables/useStatistics'

const mockGet = vi.fn()
vi.mock('@/composables/useStatistics', () => ({
  useStatistics: () => ({ get: mockGet }),
}))

let mockKillSwitchActive = false
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: {
      email_kill_switch: { active: mockKillSwitchActive, period_days: 30, threshold: 950 },
    },
  }),
}))

function makeStats(overrides: Partial<Statistics> = {}): Statistics {
  return {
    users: 419,
    performances: 120,
    ordinariumworks: 45,
    propriumworks: 30,
    email: { active: false, period_days: 30, threshold: 950, sent: 214 },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockKillSwitchActive = false
})

describe('StatisticsView', () => {
  it('loads and renders every count', async () => {
    mockGet.mockResolvedValueOnce(makeStats())
    const wrapper = mount(StatisticsView)
    await flushPromises()

    expect(wrapper.text()).toContain('Benutzer')
    expect(wrapper.text()).toContain('419')
    expect(wrapper.text()).toContain('Aufführungen')
    expect(wrapper.text()).toContain('120')
    expect(wrapper.text()).toContain('Ordinarium-Kompositionen')
    expect(wrapper.text()).toContain('45')
    expect(wrapper.text()).toContain('Proprium-Kompositionen')
    expect(wrapper.text()).toContain('30')
  })

  it('renders the email-output row with period/threshold/sent', async () => {
    mockGet.mockResolvedValueOnce(
      makeStats({ email: { active: false, period_days: 30, threshold: 950, sent: 214 } }),
    )
    const wrapper = mount(StatisticsView)
    await flushPromises()

    expect(wrapper.text()).toContain('E-Mail-Output der vergangenen 30 Tage')
    expect(wrapper.text()).toContain('(max. 950)')
    expect(wrapper.text()).toContain('214')
  })

  it('wraps every badge in an .h3 (1:1 Legacy: larger badge text, not the default badge size)', async () => {
    mockGet.mockResolvedValueOnce(makeStats())
    const wrapper = mount(StatisticsView)
    await flushPromises()

    const badges = wrapper.findAll('.badge')
    expect(badges).toHaveLength(5)
    for (const badge of badges) {
      expect(badge.element.parentElement?.classList.contains('h3')).toBe(true)
    }
  })

  it('keeps "(max. X)" inline with the label, not on its own line', async () => {
    mockGet.mockResolvedValueOnce(makeStats())
    const wrapper = mount(StatisticsView)
    await flushPromises()

    const hint = wrapper.find('small')
    expect(hint.classes()).not.toContain('d-block')
  })

  it('does not render the deliberately-omitted "Partituren im Archiv" row', async () => {
    mockGet.mockResolvedValueOnce(makeStats())
    const wrapper = mount(StatisticsView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Partituren im Archiv')
  })

  it('shows the kill-switch warning card only while active', async () => {
    mockGet.mockResolvedValueOnce(makeStats())
    const wrapperInactive = mount(StatisticsView)
    await flushPromises()
    expect(wrapperInactive.text()).not.toContain('Email-Versand aktuell deaktiviert')

    mockKillSwitchActive = true
    mockGet.mockResolvedValueOnce(makeStats())
    const wrapperActive = mount(StatisticsView)
    await flushPromises()
    expect(wrapperActive.text()).toContain('Email-Versand aktuell deaktiviert')
  })
})
