import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import MonthNavigator from '../MonthNavigator.vue'
import { linkTarget } from '@/__tests__/linkTarget'

// The "current month" link reads the clock when the component is created:
// freeze it so a run around midnight on the last day of a month cannot
// compare against a different month than the one rendered.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MonthNavigator', () => {
  it('renders the formatted month/year heading', () => {
    const wrapper = mount(MonthNavigator, {
      props: { year: 2026, month: 8, routeName: 'home' },
    })

    expect(wrapper.text()).toContain('August 2026')
  })

  it('builds prev/home/next targets against the given routeName', () => {
    const wrapper = mount(MonthNavigator, {
      props: { year: 2026, month: 8, routeName: 'administrator-sent-emails-index' },
    })

    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links).toHaveLength(3)
    for (const link of links) {
      expect(linkTarget(link)?.name).toBe('administrator-sent-emails-index')
    }
    expect(linkTarget(links[0])?.query).toEqual({ year: 2026, month: 7 })
    expect(linkTarget(links[1])?.query).toEqual({ year: 2026, month: 8 })
    expect(linkTarget(links[2])?.query).toEqual({ year: 2026, month: 9 })
  })

  it('names the three icon-only links for assistive technology', () => {
    const wrapper = mount(MonthNavigator, {
      props: { year: 2026, month: 8, routeName: 'home' },
    })

    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links.map((link) => link.attributes('aria-label'))).toEqual([
      'Vormonat',
      'Aktueller Monat',
      'Folgemonat',
    ])
    expect(links.map((link) => link.attributes('title'))).toEqual([
      'Vormonat',
      'Aktueller Monat',
      'Folgemonat',
    ])
    for (const link of links) {
      expect(link.find('i').attributes('aria-hidden')).toBe('true')
    }
  })

  it('rolls over into the previous/next year at the boundaries', () => {
    const wrapper = mount(MonthNavigator, {
      props: { year: 2026, month: 1, routeName: 'home' },
    })

    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(linkTarget(links[0])?.query).toEqual({ year: 2025, month: 12 })
  })

  it('rolls over into the next year at the December boundary', () => {
    const wrapper = mount(MonthNavigator, {
      props: { year: 2026, month: 12, routeName: 'home' },
    })

    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(linkTarget(links[2])?.query).toEqual({ year: 2027, month: 1 })
  })
})
