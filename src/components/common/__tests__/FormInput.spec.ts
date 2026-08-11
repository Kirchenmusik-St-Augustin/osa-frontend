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

  it.each(['email', 'tel', 'password'] as const)(
    'passes type="%s" through to the input element (Schritt 7 User/Profile forms)',
    (type) => {
      const wrapper = mount(FormInput, {
        props: { id: 'contact', title: 'Kontakt', modelValue: '', type },
      })

      expect(wrapper.find('input#contact').attributes('type')).toBe(type)
    },
  )

  it('renders no label at all when title is omitted (Schritt 8 Scores grid)', () => {
    const wrapper = mount(FormInput, {
      props: { id: 'part1verl', modelValue: '' },
    })

    expect(wrapper.find('label').exists()).toBe(false)
  })

  it('shows the title as small, muted text when titleSmall is set', () => {
    const wrapper = mount(FormInput, {
      props: { id: 'violine1', title: 'Violine 1', modelValue: 0, titleSmall: true },
    })

    const label = wrapper.find('label')
    expect(label.find('small.text-black-50').text()).toBe('Violine 1')
    expect(label.find('strong').exists()).toBe(false)
  })

  it('sets both readonly and disabled on a readonly text input', () => {
    const wrapper = mount(FormInput, {
      props: { id: 'werk', title: 'Werk', modelValue: 'Messe', readonly: true },
    })

    const input = wrapper.find('input')
    expect(input.attributes('readonly')).toBeDefined()
    expect(input.attributes('disabled')).toBeDefined()
  })

  it('sets both readonly and disabled on a readonly textarea', () => {
    const wrapper = mount(FormInput, {
      props: {
        id: 'bemerkung',
        title: 'Bemerkung',
        modelValue: 'x',
        type: 'textarea',
        readonly: true,
      },
    })

    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('readonly')).toBeDefined()
    expect(textarea.attributes('disabled')).toBeDefined()
  })

  it('adds form-control-sm when small is set', () => {
    const wrapper = mount(FormInput, {
      props: { id: 'kasten', title: 'Kasten', modelValue: '', small: true },
    })

    expect(wrapper.find('input').classes()).toContain('form-control-sm')
  })

  it('applies maxlength on a text input, matching the "max" prop', () => {
    const wrapper = mount(FormInput, {
      props: { id: 'boxnr', title: 'Boxnummer', modelValue: '', max: 16 },
    })

    expect(wrapper.find('input').attributes('maxlength')).toBe('16')
  })

  it('applies maxlength on a textarea too', () => {
    const wrapper = mount(FormInput, {
      props: {
        id: 'bemerkung',
        title: 'Bemerkung',
        modelValue: '',
        type: 'textarea',
        max: 256,
      },
    })

    expect(wrapper.find('textarea').attributes('maxlength')).toBe('256')
  })
})
