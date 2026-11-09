import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PropriumSetup from '../PropriumSetup.vue'
import type { PerformancePropriumItem } from '@/composables/usePerformances'
import { testId } from '@/__tests__/testId'

const item: PerformancePropriumItem = {
  propriumelement_id: testId(1),
  propriumelement_name: 'Introitus',
  propriumwork_id: testId(2),
  propriumwork_name: 'Gregorianik I',
  artist_name: 'HAYDN, Joseph',
  description: 'Feierlich',
  demanding: false,
}

describe('PropriumSetup', () => {
  it('renders the element/work/artist/description read-only', () => {
    const wrapper = mount(PropriumSetup, { props: { proprium: [item] } })

    expect(wrapper.text()).toContain('Introitus:')
    expect(wrapper.text()).toContain('HAYDN, Joseph: Gregorianik I')
    expect(wrapper.text()).toContain('Feierlich')
    expect(wrapper.find('.fa-trash').exists()).toBe(false)
  })

  it('omits the description line when there is none', () => {
    const wrapper = mount(PropriumSetup, {
      props: { proprium: [{ ...item, description: null }] },
    })

    expect(wrapper.text()).not.toContain('Feierlich')
  })

  it('shows a remove icon and emits removeElement when withControls is set', async () => {
    const wrapper = mount(PropriumSetup, {
      props: { proprium: [item], withControls: true },
    })

    await wrapper.find('.fa-trash').trigger('click')

    expect(wrapper.emitted('removeElement')).toEqual([[item]])
  })

  it('renders the remove control as a named button', () => {
    const wrapper = mount(PropriumSetup, {
      props: { proprium: [item], withControls: true },
    })

    const remove = wrapper.find('button')
    expect(remove.attributes('type')).toBe('button')
    expect(remove.attributes('aria-label')).toBe('entfernen')
    expect(remove.find('i').attributes('aria-hidden')).toBe('true')
  })
})
