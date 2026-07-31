import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuantityEditor from '../QuantityEditor.vue'

const available = [
  { id: 1, name: 'Fagott' },
  { id: 2, name: 'Oboe' },
  { id: 3, name: 'Klarinette' },
]

describe('QuantityEditor', () => {
  it('lists only unused items in the dropdown, pre-selecting the first one', () => {
    const wrapper = mount(QuantityEditor, {
      props: { modelValue: [{ id: 1, name: 'Fagott', quantity: 2 }], available },
    })

    const optionTexts = wrapper.findAll('option').map((option) => option.text())
    expect(optionTexts).toEqual(['Oboe', 'Klarinette'])
  })

  it('adds the selected unused item with quantity 1', async () => {
    const wrapper = mount(QuantityEditor, {
      props: { modelValue: [], available },
    })

    await wrapper.find('select').setValue('1')
    await wrapper.find('button.btn-primary').trigger('click')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted?.[emitted.length - 1]).toEqual([[{ id: 1, name: 'Fagott', quantity: 1 }]])
  })

  it('inserts the added item at its canonical position, not at the end', async () => {
    const wrapper = mount(QuantityEditor, {
      props: { modelValue: [{ id: 1, name: 'Fagott', quantity: 1 }], available },
    })

    await wrapper.find('select').setValue('2')
    await wrapper.find('button.btn-primary').trigger('click')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted?.[emitted.length - 1]).toEqual([
      [
        { id: 1, name: 'Fagott', quantity: 1 },
        { id: 2, name: 'Oboe', quantity: 1 },
      ],
    ])
  })

  it('increments quantity via the plus icon', async () => {
    const wrapper = mount(QuantityEditor, {
      props: { modelValue: [{ id: 1, name: 'Fagott', quantity: 1 }], available },
    })

    await wrapper.find('.fa-plus-circle').trigger('click')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted?.[0]).toEqual([[{ id: 1, name: 'Fagott', quantity: 2 }]])
  })

  it('removes the row once quantity drops below 1 via the minus icon', async () => {
    const wrapper = mount(QuantityEditor, {
      props: { modelValue: [{ id: 1, name: 'Fagott', quantity: 1 }], available },
    })

    await wrapper.find('.fa-minus-circle').trigger('click')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted?.[0]).toEqual([[]])
  })

  it('removes a row instantly via the trash icon', async () => {
    const wrapper = mount(QuantityEditor, {
      props: {
        modelValue: [
          { id: 1, name: 'Fagott', quantity: 1 },
          { id: 2, name: 'Oboe', quantity: 3 },
        ],
        available,
      },
    })

    await wrapper.find('.fa-trash').trigger('click')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted?.[0]).toEqual([[{ id: 2, name: 'Oboe', quantity: 3 }]])
  })

  it('only shows the reset link once the setup diverges from its initial value', async () => {
    const wrapper = mount(QuantityEditor, {
      props: { modelValue: [{ id: 1, name: 'Fagott', quantity: 1 }], available },
    })

    expect(wrapper.text()).not.toContain('auf derz. Werte zurücksetzen')

    await wrapper.find('.fa-plus-circle').trigger('click')
    await wrapper.setProps({
      modelValue: [{ id: 1, name: 'Fagott', quantity: 2 }],
    })

    expect(wrapper.text()).toContain('auf derz. Werte zurücksetzen')
  })

  it('reset restores the original setup', async () => {
    const wrapper = mount(QuantityEditor, {
      props: { modelValue: [{ id: 1, name: 'Fagott', quantity: 1 }], available },
    })

    await wrapper.find('.fa-plus-circle').trigger('click')
    await wrapper.setProps({ modelValue: [{ id: 1, name: 'Fagott', quantity: 2 }] })

    await wrapper.find('small.text-black-50').trigger('click')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted?.[emitted.length - 1]).toEqual([[{ id: 1, name: 'Fagott', quantity: 1 }]])
  })
})
