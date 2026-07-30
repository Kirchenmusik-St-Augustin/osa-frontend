import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PerformanceCard, { type PerformanceCardData } from '../PerformanceCard.vue'
import { toWallClockString } from '@/services/dateFormat'

let mockPermissions: string[] = []
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: (permission: string) => mockPermissions.includes(permission),
  }),
}))

beforeEach(() => {
  mockPermissions = []
})

function futureIso(): string {
  const date = new Date()
  date.setDate(date.getDate() + 10)
  return toWallClockString(date)
}

function pastIso(): string {
  const date = new Date()
  date.setDate(date.getDate() - 10)
  return toWallClockString(date)
}

const basePerformance: PerformanceCardData = {
  id: 42,
  schedule: futureIso(),
  location: { name: 'Augustinerkirche', color: '336699' },
  ordinariumwork_name: 'Krönungsmesse',
  ordinariumwork_artist_name: 'MOZART, Wolfgang',
  ordinariumwork_demanding: false,
  artist_name: null,
  proprium: [],
  demanding_proprium: false,
  rehearsals: [],
}

describe('PerformanceCard', () => {
  it('renders location, composer and ordinariumwork name', () => {
    const wrapper = mount(PerformanceCard, { props: { performance: basePerformance } })

    expect(wrapper.text()).toContain('Augustinerkirche')
    expect(wrapper.text()).toContain('MOZART, Wolfgang')
    expect(wrapper.text()).toContain('Krönungsmesse')
  })

  it('shows the conductor line only when a conductor is set', () => {
    const withoutConductor = mount(PerformanceCard, { props: { performance: basePerformance } })
    expect(withoutConductor.text()).not.toContain('Dirigent:')

    const withConductor = mount(PerformanceCard, {
      props: { performance: { ...basePerformance, artist_name: 'ORTNER, Erwin' } },
    })
    expect(withConductor.text()).toContain('Dirigent:')
    expect(withConductor.text()).toContain('ORTNER, Erwin')
  })

  it('shows demanding-ordinarium and demanding-proprium warning icons conditionally', () => {
    const plain = mount(PerformanceCard, { props: { performance: basePerformance } })
    expect(plain.find('.fa-exclamation-circle').exists()).toBe(false)

    const demanding = mount(PerformanceCard, {
      props: {
        performance: {
          ...basePerformance,
          ordinariumwork_demanding: true,
          demanding_proprium: true,
        },
      },
    })
    expect(demanding.findAll('.fa-exclamation-circle')).toHaveLength(2)
  })

  it('toggles the rehearsals list', async () => {
    const wrapper = mount(PerformanceCard, {
      props: {
        performance: {
          ...basePerformance,
          rehearsals: [{ schedule: futureIso(), comment: 'GP' }],
        },
      },
    })

    expect(wrapper.text()).not.toContain('GP')
    await wrapper.find('.fa-eye').trigger('click')
    expect(wrapper.text()).toContain('GP')
  })

  it('toggles the read-only Proprium display without a remove control', async () => {
    const wrapper = mount(PerformanceCard, {
      props: {
        performance: {
          ...basePerformance,
          proprium: [
            {
              propriumelement_id: 1,
              propriumelement_name: 'Introitus',
              propriumwork_id: 2,
              propriumwork_name: 'Gregorianik I',
              artist_name: 'HAYDN, Joseph',
              description: null,
              demanding: false,
            },
          ],
        },
      },
    })

    expect(wrapper.text()).not.toContain('Gregorianik I')
    await wrapper.find('.fa-caret-right').trigger('click')
    expect(wrapper.text()).toContain('Gregorianik I')
    expect(wrapper.find('.fa-trash').exists()).toBe(false)
  })

  it('hides the dropdown menu when showMenu is false', () => {
    const wrapper = mount(PerformanceCard, { props: { performance: basePerformance } })
    expect(wrapper.find('.dropdown').exists()).toBe(false)
  })

  it('always shows "Information" but hides "Bearbeiten" without performanceMaintain', () => {
    const wrapper = mount(PerformanceCard, {
      props: { performance: basePerformance, showMenu: true },
    })

    expect(wrapper.text()).toContain('Information')
    expect(wrapper.text()).not.toContain('Bearbeiten')
  })

  it('shows "Bearbeiten" for an upcoming performance with performanceMaintain', () => {
    mockPermissions = ['performanceMaintain']
    const wrapper = mount(PerformanceCard, {
      props: { performance: basePerformance, showMenu: true },
    })

    expect(wrapper.text()).toContain('Bearbeiten')
  })

  it('hides "Bearbeiten" for a past performance even with performanceMaintain', () => {
    mockPermissions = ['performanceMaintain']
    const wrapper = mount(PerformanceCard, {
      props: { performance: { ...basePerformance, schedule: pastIso() }, showMenu: true },
    })

    expect(wrapper.text()).not.toContain('Bearbeiten')
  })

  it('adds the border-primary class only for upcoming performances', () => {
    const upcoming = mount(PerformanceCard, { props: { performance: basePerformance } })
    expect(upcoming.classes()).toContain('border-primary')

    const past = mount(PerformanceCard, {
      props: { performance: { ...basePerformance, schedule: pastIso() } },
    })
    expect(past.classes()).not.toContain('border-primary')
  })
})
