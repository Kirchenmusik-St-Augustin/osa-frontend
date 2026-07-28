import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppNavbar from '../AppNavbar.vue'

describe('AppNavbar', () => {
  it('renders the legacy brand text', () => {
    expect(mount(AppNavbar).text()).toContain('Orchester-Einteilung')
  })

  it('renders a Bootstrap navbar-toggler for mobile', () => {
    expect(mount(AppNavbar).find('.navbar-toggler').exists()).toBe(true)
  })

  it('uses the legacy text-bg-primary/dark theming', () => {
    const wrapper = mount(AppNavbar)
    const nav = wrapper.find('nav')
    expect(nav.classes()).toContain('text-bg-primary')
    expect(nav.attributes('data-bs-theme')).toBe('dark')
  })
})
