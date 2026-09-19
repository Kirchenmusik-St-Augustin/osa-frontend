import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MultiSelectDropdown, { type MultiSelectGroup } from '../MultiSelectDropdown.vue'

const options: MultiSelectGroup[] = [
  {
    label: 'Anfragen',
    values: [{ id: 1, name: 'Requester' }],
  },
  {
    label: 'direkt buchen',
    values: [
      { id: 2, name: 'Other' },
      { id: 3, name: 'Second' },
    ],
  },
]

describe('MultiSelectDropdown', () => {
  it('shows the selected count and stays collapsed until the badge is clicked', () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [] },
    })
    expect(wrapper.text()).toContain('0 ausgewählt')
    expect(wrapper.find('.list-group-item').exists()).toBe(false)
  })

  it('opens on badge click and renders only the first group by default', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [] },
    })
    await wrapper.find('.c-pointer').trigger('click')

    expect(wrapper.text()).toContain('Requester')
    expect(wrapper.text()).not.toContain('Other')
    const tabs = wrapper.findAll('.nav-link')
    expect(tabs[0]?.classes()).toContain('active')
    expect(tabs[1]?.classes()).not.toContain('active')
  })

  it('switches tabs on click, swapping the rendered group', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [] },
    })
    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.findAll('.nav-link')[1]?.trigger('click')

    expect(wrapper.text()).toContain('Other')
    expect(wrapper.text()).not.toContain('Requester')
    const tabs = wrapper.findAll('.nav-link')
    expect(tabs[0]?.classes()).not.toContain('active')
    expect(tabs[1]?.classes()).toContain('active')
  })

  it('toggles an item into and out of the model on click', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [] },
    })
    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.find('.list-group-item').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([1])
  })

  it('removes an already-selected item from the model on click, keeping the others', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [1, 2] },
    })
    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.find('.list-group-item').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([2])
  })

  it('falls back to the first tab when a group disappears from the options', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [] },
    })
    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.findAll('.nav-link')[1]?.trigger('click')
    expect(wrapper.findAll('.nav-link')[1]?.classes()).toContain('active')

    const remainingGroup = options[1]!
    await wrapper.setProps({ options: [remainingGroup] })

    expect(wrapper.findAll('.nav-link')).toHaveLength(1)
    expect(wrapper.find('.nav-link').classes()).toContain('active')
    expect(wrapper.text()).toContain('Other')
  })

  it('shows a checked icon only for already-selected items', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [1] },
    })
    await wrapper.find('.c-pointer').trigger('click')

    const item = wrapper.find('.list-group-item')
    expect(item.find('.fa-square-check').exists()).toBe(true)
  })

  it('stays open when an item inside the panel is clicked', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [] },
      attachTo: document.body,
    })
    await wrapper.find('.c-pointer').trigger('click')

    await wrapper.find('.list-group-item').trigger('click')

    expect(wrapper.find('.multiselect-panel').exists()).toBe(true)
    wrapper.unmount()
  })

  it('closes when clicking outside the component', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [] },
      attachTo: document.body,
    })
    await wrapper.find('.c-pointer').trigger('click')
    expect(wrapper.find('.multiselect-panel').exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.multiselect-panel').exists()).toBe(false)
    wrapper.unmount()
  })
})
