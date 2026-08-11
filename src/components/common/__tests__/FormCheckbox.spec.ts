import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FormCheckbox from '../FormCheckbox.vue'

describe('FormCheckbox', () => {
  it('renders a plain checkbox by default, bound via v-model', async () => {
    const wrapper = mount(FormCheckbox, {
      props: { id: 'demanding', title: 'anspruchsvoll', modelValue: false },
    })

    const input = wrapper.find('input#demanding')
    expect(input.attributes('role')).toBe('checkbox')
    expect(wrapper.find('.form-switch').exists()).toBe(false)

    await input.setValue(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('renders a switch when asSwitch is set', () => {
    const wrapper = mount(FormCheckbox, {
      props: { id: 'composer', title: 'Komponist', modelValue: false, asSwitch: true },
    })

    expect(wrapper.find('.form-switch').exists()).toBe(true)
    expect(wrapper.find('input').attributes('role')).toBe('switch')
  })

  it('shows the given title as label text', () => {
    const wrapper = mount(FormCheckbox, {
      props: { id: 'demanding', title: 'anspruchsvoll', modelValue: false },
    })

    expect(wrapper.text()).toContain('anspruchsvoll')
  })
})
