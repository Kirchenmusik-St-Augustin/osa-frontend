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

  it('omits the bordered padding wrapper when hideBorder is set', async () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Details', initShow: true, hideBorder: true },
      slots: { default: 'Visible content' },
    })

    const contentWrapper = wrapper.findAll('div')[1]
    expect(contentWrapper.classes()).not.toContain('border')
  })
})
