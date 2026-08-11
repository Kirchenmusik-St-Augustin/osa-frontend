import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreFieldsFieldComponent from '../ScoreFieldsFieldComponent.vue'
import type { ScoreFieldConfig } from '@/composables/useScores'

function makeConfig(overrides: Partial<ScoreFieldConfig> = {}): ScoreFieldConfig {
  return {
    label: 'Werk',
    kind: 'text',
    length: 75,
    required: false,
    values: null,
    ...overrides,
  }
}

describe('ScoreFieldsFieldComponent', () => {
  it('renders a text FormInput for kind "text"', () => {
    const wrapper = mount(ScoreFieldsFieldComponent, {
      props: { name: 'werk', config: makeConfig(), modelValue: 'Requiem', withTitle: true },
    })

    const input = wrapper.find('input#score-field-werk')
    expect(input.attributes('type')).toBe('text')
    expect(input.attributes('maxlength')).toBe('75')
    expect(wrapper.text()).toContain('Werk')
  })

  it('renders a number FormInput for kind "number", max fixed at 9999', () => {
    const wrapper = mount(ScoreFieldsFieldComponent, {
      props: {
        name: 'violine1',
        config: makeConfig({ kind: 'number', label: 'Violine 1', length: null }),
        modelValue: 2,
      },
    })

    const input = wrapper.find('input#score-field-violine1')
    expect(input.attributes('type')).toBe('number')
    expect(input.attributes('max')).toBe('9999')
  })

  it('renders a textarea for kind "textarea"', () => {
    const wrapper = mount(ScoreFieldsFieldComponent, {
      props: {
        name: 'bemerkung',
        config: makeConfig({ kind: 'textarea', label: 'Bemerkung', length: 256 }),
        modelValue: '',
      },
    })

    const textarea = wrapper.find('textarea#score-field-bemerkung')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('maxlength')).toBe('256')
  })

  it('renders a select with every configured value for kind "select"', async () => {
    const wrapper = mount(ScoreFieldsFieldComponent, {
      props: {
        name: 'part1art',
        config: makeConfig({
          kind: 'select',
          label: null,
          length: null,
          values: ['', 'Original', 'Kopie', 'Original/Kopie'],
        }),
        modelValue: '',
      },
    })

    const select = wrapper.find('select#score-field-part1art')
    expect(select.exists()).toBe(true)
    expect(select.findAll('option').map((o) => o.text())).toEqual([
      '',
      'Original',
      'Kopie',
      'Original/Kopie',
    ])

    await select.setValue('Kopie')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Kopie'])
  })

  it('does not render a title for grouped fields without with-title', () => {
    const wrapper = mount(ScoreFieldsFieldComponent, {
      props: {
        name: 'part1verl',
        config: makeConfig({ kind: 'text', label: null, length: 64 }),
        modelValue: '',
      },
    })

    expect(wrapper.find('label').exists()).toBe(false)
  })

  it('shows an "unknown type" fallback when config is missing', () => {
    const wrapper = mount(ScoreFieldsFieldComponent, {
      props: { name: 'mystery', modelValue: '' },
    })

    expect(wrapper.text()).toContain('Unknown type in config:')
  })

  it('forwards readonly to the underlying FormInput', () => {
    const wrapper = mount(ScoreFieldsFieldComponent, {
      props: { name: 'werk', config: makeConfig(), modelValue: 'Requiem', readonly: true },
    })

    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })
})
