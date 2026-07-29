import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FormSelect from '../FormSelect.vue'

const options = [
  { id: 1, label: 'Mozart' },
  { id: 2, label: 'Haydn' },
]

describe('FormSelect', () => {
  it('renders an option per entry, bound via v-model', async () => {
    const wrapper = mount(FormSelect, {
      props: { id: 'artist', title: 'Komponist', modelValue: null, options },
    })

    const optionElements = wrapper.findAll('option')
    expect(optionElements.map((option) => option.text())).toEqual(['Mozart', 'Haydn'])

    await wrapper.find('select').setValue('2')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([2])
  })

  it('marks the select as required when requested', () => {
    const wrapper = mount(FormSelect, {
      props: { id: 'artist', title: 'Komponist', modelValue: null, options, required: true },
    })

    expect(wrapper.find('select').attributes('required')).toBeDefined()
  })

  it('always reserves space for the error line', () => {
    const wrapper = mount(FormSelect, {
      props: { id: 'artist', title: 'Komponist', modelValue: null, options },
    })

    expect(wrapper.find('small.text-danger').exists()).toBe(true)
  })

  it('shows the given error message', () => {
    const wrapper = mount(FormSelect, {
      props: {
        id: 'artist',
        title: 'Komponist',
        modelValue: null,
        options,
        error: 'Komponist/in wurde nicht gefunden.',
      },
    })

    expect(wrapper.text()).toContain('Komponist/in wurde nicht gefunden.')
  })
})
