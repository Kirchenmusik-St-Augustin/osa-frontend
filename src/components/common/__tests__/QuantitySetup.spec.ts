import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuantitySetup from '../QuantitySetup.vue'
import { testId } from '@/__tests__/testId'

const setup = [
  { id: testId(1), name: 'Fagott', quantity: 2 },
  { id: testId(2), name: 'Oboe', quantity: 1 },
]

describe('QuantitySetup', () => {
  it('renders name and quantity per row without controls by default', () => {
    const wrapper = mount(QuantitySetup, { props: { setup } })

    expect(wrapper.text()).toContain('Fagott')
    expect(wrapper.text()).toContain('Oboe')
    expect(wrapper.find('.fa-trash').exists()).toBe(false)
    expect(wrapper.find('.fa-plus-circle').exists()).toBe(false)
  })

  it('renders trash/minus/plus icons when withControls is set', () => {
    const wrapper = mount(QuantitySetup, { props: { setup, withControls: true } })

    expect(wrapper.findAll('.fa-trash')).toHaveLength(2)
    expect(wrapper.findAll('.fa-minus-circle')).toHaveLength(2)
    expect(wrapper.findAll('.fa-plus-circle')).toHaveLength(2)
  })

  it('renders every control as a named button', () => {
    const wrapper = mount(QuantitySetup, { props: { setup, withControls: true } })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(6)
    expect(buttons.map((button) => button.attributes('aria-label'))).toEqual([
      'entfernen',
      'verringern',
      'erhöhen',
      'entfernen',
      'verringern',
      'erhöhen',
    ])
    for (const button of buttons) {
      expect(button.attributes('type')).toBe('button')
      expect(button.find('i').attributes('aria-hidden')).toBe('true')
    }
  })

  it('emits remove with the item id when the trash icon is clicked', async () => {
    const wrapper = mount(QuantitySetup, { props: { setup, withControls: true } })

    await wrapper.findAll('.fa-trash')[1]?.trigger('click')

    expect(wrapper.emitted('remove')?.[0]).toEqual([testId(2)])
  })

  it('emits modify with increase=true/false for plus/minus icons', async () => {
    const wrapper = mount(QuantitySetup, { props: { setup, withControls: true } })

    await wrapper.findAll('.fa-plus-circle')[0]?.trigger('click')
    await wrapper.findAll('.fa-minus-circle')[0]?.trigger('click')

    expect(wrapper.emitted('modify')?.[0]).toEqual([testId(1), true])
    expect(wrapper.emitted('modify')?.[1]).toEqual([testId(1), false])
  })

  it('marks an archived row, but not an active or unflagged one', () => {
    const mixedSetup = [
      { id: testId(1), name: 'Fagott', quantity: 2, active: true },
      { id: testId(2), name: 'Serpent', quantity: 1, active: false },
      { id: testId(3), name: 'Oboe', quantity: 1 },
    ]
    const wrapper = mount(QuantitySetup, { props: { setup: mixedSetup } })

    expect(wrapper.text()).toContain('archiviert')
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0]?.text()).not.toContain('archiviert')
    expect(rows[1]?.text()).toContain('archiviert')
    expect(rows[2]?.text()).not.toContain('archiviert')
  })
})
