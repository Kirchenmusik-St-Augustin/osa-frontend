import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import MonthNavigator from '../MonthNavigator.vue'
import { linkTarget } from '@/__tests__/linkTarget'

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
    const now = new Date()
    expect(linkTarget(links[1])?.query).toEqual({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    })
    expect(linkTarget(links[2])?.query).toEqual({ year: 2026, month: 9 })
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
