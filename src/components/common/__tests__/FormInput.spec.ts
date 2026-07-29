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

  it('renders a number input with min defaulting to 0, emitting a number', async () => {
    const wrapper = mount(FormInput, {
      props: { id: 'duration', title: 'Dauer', modelValue: null, type: 'number' },
    })

    const input = wrapper.find('input#duration')
    expect(input.attributes('type')).toBe('number')
    expect(input.attributes('min')).toBe('0')

    await input.setValue('42')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([42])
  })

  it('passes an explicit max through to the number input', () => {
    const wrapper = mount(FormInput, {
      props: { id: 'duration', title: 'Dauer', modelValue: null, type: 'number', max: 999 },
    })

    expect(wrapper.find('input#duration').attributes('max')).toBe('999')
  })
})
