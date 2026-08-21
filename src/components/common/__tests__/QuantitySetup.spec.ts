import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuantitySetup from '../QuantitySetup.vue'

const setup = [
  { id: 1, name: 'Fagott', quantity: 2 },
  { id: 2, name: 'Oboe', quantity: 1 },
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

  it('emits remove with the item id when the trash icon is clicked', async () => {
    const wrapper = mount(QuantitySetup, { props: { setup, withControls: true } })

    await wrapper.findAll('.fa-trash')[1]?.trigger('click')

    expect(wrapper.emitted('remove')?.[0]).toEqual([2])
  })

  it('emits modify with increase=true/false for plus/minus icons', async () => {
    const wrapper = mount(QuantitySetup, { props: { setup, withControls: true } })

    await wrapper.findAll('.fa-plus-circle')[0]?.trigger('click')
    await wrapper.findAll('.fa-minus-circle')[0]?.trigger('click')

    expect(wrapper.emitted('modify')?.[0]).toEqual([1, true])
    expect(wrapper.emitted('modify')?.[1]).toEqual([1, false])
  })

  it('marks an archived row, but not an active or unflagged one', () => {
    const mixedSetup = [
      { id: 1, name: 'Fagott', quantity: 2, active: true },
      { id: 2, name: 'Serpent', quantity: 1, active: false },
      { id: 3, name: 'Oboe', quantity: 1 },
    ]
    const wrapper = mount(QuantitySetup, { props: { setup: mixedSetup } })

    expect(wrapper.text()).toContain('archiviert')
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0]?.text()).not.toContain('archiviert')
    expect(rows[1]?.text()).toContain('archiviert')
    expect(rows[2]?.text()).not.toContain('archiviert')
  })
})
