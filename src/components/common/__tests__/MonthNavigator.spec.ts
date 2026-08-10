import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import MonthNavigator from '../MonthNavigator.vue'

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
      expect(link.props('to').name).toBe('administrator-sent-emails-index')
    }
    expect(links[0]?.props('to').query).toEqual({ year: 2026, month: 7 })
    const now = new Date()
    expect(links[1]?.props('to').query).toEqual({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    })
    expect(links[2]?.props('to').query).toEqual({ year: 2026, month: 9 })
  })

  it('rolls over into the previous/next year at the boundaries', () => {
    const wrapper = mount(MonthNavigator, {
      props: { year: 2026, month: 1, routeName: 'home' },
    })

    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links[0]?.props('to').query).toEqual({ year: 2025, month: 12 })
  })
})
