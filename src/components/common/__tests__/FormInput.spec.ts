import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FormInput from '../FormInput.vue'

describe('FormInput', () => {
  it('renders a text input by default, bound via v-model', async () => {
    const wrapper = mount(FormInput, {
      props: { id: 'name', title: 'Name', modelValue: '' },
    })

    const input = wrapper.find('input#name')
    expect(input.exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.text()).toContain('Name')

    await input.setValue('Fagott')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Fagott'])
  })

  it('renders a textarea when type is "textarea"', () => {
    const wrapper = mount(FormInput, {
      props: { id: 'description', title: 'Beschreibung', modelValue: '', type: 'textarea' },
    })

    expect(wrapper.find('textarea#description').exists()).toBe(true)
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('marks the input as required when requested', () => {
    const wrapper = mount(FormInput, {
      props: { id: 'name', title: 'Name', modelValue: '', required: true },
    })

    expect(wrapper.find('input').attributes('required')).toBeDefined()
  })

  it('always reserves space for the error line, even when empty', () => {
    const wrapper = mount(FormInput, {
      props: { id: 'name', title: 'Name', modelValue: '' },
    })

    expect(wrapper.find('small.text-danger').exists()).toBe(true)
  })

  it('shows the given error message', () => {
    const wrapper = mount(FormInput, {
      props: { id: 'name', title: 'Name', modelValue: '', error: 'Der Name ist bereits vergeben.' },
    })

    expect(wrapper.text()).toContain('Der Name ist bereits vergeben.')
  })
})
