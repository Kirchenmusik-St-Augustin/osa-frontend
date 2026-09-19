import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppDropdown from '../AppDropdown.vue'

function mountDropdown(props: Record<string, unknown> = {}) {
  return mount(AppDropdown, {
    props,
    slots: {
      toggle: 'Menü',
      default: '<a class="dropdown-item" href="#">Eintrag</a>',
    },
    attachTo: document.body,
  })
}

const isOpen = (wrapper: ReturnType<typeof mountDropdown>) =>
  wrapper.find('.dropdown-menu').classes().includes('show')

describe('AppDropdown', () => {
  it('starts closed and renders the toggle and menu slots', () => {
    const wrapper = mountDropdown()

    expect(isOpen(wrapper)).toBe(false)
    expect(wrapper.find('.dropdown-toggle').text()).toBe('Menü')
    expect(wrapper.find('.dropdown-toggle').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.dropdown-menu').text()).toBe('Eintrag')
  })

  it('opens and closes on toggle clicks, mirroring the state in aria-expanded', async () => {
    const wrapper = mountDropdown()
    const toggle = wrapper.find('.dropdown-toggle')

    await toggle.trigger('click')
    expect(isOpen(wrapper)).toBe(true)
    expect(toggle.attributes('aria-expanded')).toBe('true')

    await toggle.trigger('click')
    expect(isOpen(wrapper)).toBe(false)
  })

  it('closes when an entry inside the menu is clicked', async () => {
    const wrapper = mountDropdown()
    await wrapper.find('.dropdown-toggle').trigger('click')

    await wrapper.find('.dropdown-item').trigger('click')

    expect(isOpen(wrapper)).toBe(false)
  })

  it('closes on a click outside the dropdown', async () => {
    const wrapper = mountDropdown()
    await wrapper.find('.dropdown-toggle').trigger('click')

    document.body.click()
    await wrapper.vm.$nextTick()

    expect(isOpen(wrapper)).toBe(false)
  })

  it('closes on Escape', async () => {
    const wrapper = mountDropdown()
    await wrapper.find('.dropdown-toggle').trigger('click')

    await wrapper.find('.dropdown-toggle').trigger('keydown', { key: 'Escape' })

    expect(isOpen(wrapper)).toBe(false)
  })

  it('applies the toggle classes, end alignment, theme and menu tag from its props', () => {
    const wrapper = mountDropdown({
      toggleClass: 'btn btn-sm btn-primary',
      menuEnd: true,
      menuTheme: 'light',
      menuTag: 'ul',
    })

    expect(wrapper.find('.dropdown-toggle').classes()).toEqual(
      expect.arrayContaining(['btn', 'btn-sm', 'btn-primary']),
    )
    const menu = wrapper.find('.dropdown-menu')
    expect(menu.element.tagName).toBe('UL')
    expect(menu.classes()).toContain('dropdown-menu-end')
    expect(menu.attributes('data-bs-theme')).toBe('light')
    expect(menu.attributes('data-bs-popper')).toBe('static')
  })

  it('omits the theme attribute when none is given', () => {
    const wrapper = mountDropdown()

    expect(wrapper.find('.dropdown-menu').attributes('data-bs-theme')).toBeUndefined()
  })
})
