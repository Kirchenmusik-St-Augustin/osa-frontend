import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CollapsibleSection from '../CollapsibleSection.vue'

describe('CollapsibleSection', () => {
  it('starts collapsed by default and shows the slot after a click', async () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Details' },
      slots: { default: 'Hidden content' },
    })

    expect(wrapper.text()).not.toContain('Hidden content')
    expect(wrapper.text()).toContain('anzeigen')

    await wrapper.find('.c-pointer').trigger('click')

    expect(wrapper.text()).toContain('Hidden content')
    expect(wrapper.text()).toContain('verbergen')
  })

  it('exposes the toggle as a button that mirrors the state in aria-expanded', async () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Details' },
      slots: { default: 'Hidden content' },
    })
    const toggle = wrapper.find('button')

    expect(toggle.attributes('type')).toBe('button')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.find('i').attributes('aria-hidden')).toBe('true')

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('true')
  })

  it('starts expanded when initShow is set', () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Details', initShow: true },
      slots: { default: 'Visible content' },
    })

    expect(wrapper.text()).toContain('Visible content')
  })

  it('omits the "anzeigen"/"verbergen" hint when hideDesc is set', () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Details', hideDesc: true },
      slots: { default: 'Hidden content' },
    })

    expect(wrapper.text()).not.toContain('anzeigen')
  })

  it('wraps the content in a bordered box by default', () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Details', initShow: true },
      slots: { default: '<p class="content">Visible content</p>' },
    })

    expect(wrapper.find('.content').element.parentElement?.classList).toContain('border')
  })

  it('omits the bordered padding wrapper when hideBorder is set', () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Details', initShow: true, hideBorder: true },
      slots: { default: '<p class="content">Visible content</p>' },
    })

    expect(wrapper.find('.content').element.parentElement?.classList).not.toContain('border')
  })
})
