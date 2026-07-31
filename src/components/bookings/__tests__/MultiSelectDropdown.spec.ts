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

  it('opens on badge click and shows only the first group by default', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [] },
    })
    await wrapper.find('.c-pointer').trigger('click')

    expect(wrapper.text()).toContain('Requester')
    // Bootstrap's own stylesheet drives .tab-pane visibility via the
    // "active" class (`.tab-pane { display: none } .tab-pane.active {
    // display: block }`) -- toggling it via v-show instead would only
    // ever remove/restore an inline override, which falls back to that
    // same stylesheet "none" once shown. Asserting on the class (not
    // isVisible(), which needs the real stylesheet loaded to mean
    // anything) is what actually matches Bootstrap's contract here.
    const panes = wrapper.findAll('.tab-pane')
    expect(panes[0]?.classes()).toContain('active')
    expect(panes[1]?.classes()).not.toContain('active')
  })

  it('switches tabs on click, revealing the other group', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [] },
    })
    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.findAll('.nav-link')[1]?.trigger('click')

    const panes = wrapper.findAll('.tab-pane')
    expect(panes[0]?.classes()).not.toContain('active')
    expect(panes[1]?.classes()).toContain('active')
  })

  it('toggles an item into and out of the model on click', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [] },
    })
    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.find('.list-group-item').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([1])
  })

  it('shows a checked icon only for already-selected items', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [1] },
    })
    await wrapper.find('.c-pointer').trigger('click')

    const item = wrapper.find('.list-group-item')
    expect(item.find('.fa-square-check').exists()).toBe(true)
  })

  it('closes when clicking outside the component', async () => {
    const wrapper = mount(MultiSelectDropdown, {
      props: { options, modelValue: [] },
      attachTo: document.body,
    })
    await wrapper.find('.c-pointer').trigger('click')
    expect(wrapper.find('.dropdown').exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.dropdown').exists()).toBe(false)
    wrapper.unmount()
  })
})
