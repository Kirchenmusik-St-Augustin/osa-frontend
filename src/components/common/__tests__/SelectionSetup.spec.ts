import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SelectionSetup from '../SelectionSetup.vue'

const available = [
  { id: 1, name: 'Konzertmeister' },
  { id: 2, name: 'Violine 1' },
  { id: 3, name: 'Violine 2' },
]

describe('SelectionSetup', () => {
  it('renders a removable row only for assigned items, not the whole catalog', () => {
    const wrapper = mount(SelectionSetup, {
      props: { available, modelValue: [available[0]!] },
    })

    // "Violine 1"/"Violine 2" still appear as <option>s in the add-dropdown
    // on the right -- only the removable-row count on the left is under
    // test here.
    const trashIcons = wrapper.findAll('i.fa-trash')
    expect(trashIcons).toHaveLength(1)
    expect(wrapper.text()).toContain('Konzertmeister')
  })

  it('shows the title only when given', () => {
    const withTitle = mount(SelectionSetup, {
      props: { available, modelValue: [], title: 'Instrumente' },
    })
    expect(withTitle.text()).toContain('Instrumente')

    const withoutTitle = mount(SelectionSetup, { props: { available, modelValue: [] } })
    expect(withoutTitle.find('strong').exists()).toBe(false)
  })

  it('removes an item when its trash icon is clicked', async () => {
    const wrapper = mount(SelectionSetup, {
      props: { available, modelValue: [available[0]!, available[1]!] },
    })

    await wrapper.find('i.fa-trash').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([available[1]])
  })

  it('adds the selected dropdown item when "hinzufügen" is clicked', async () => {
    const wrapper = mount(SelectionSetup, {
      props: { available, modelValue: [available[0]!] },
    })

    // First unused item (Violine 1, id 2) is preselected by default.
    await wrapper.find('button.btn-primary').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([available[0], available[1]])
  })

  it('hides the add-dropdown once every available item is assigned', () => {
    const wrapper = mount(SelectionSetup, { props: { available, modelValue: available } })

    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.find('button.btn-primary').exists()).toBe(false)
    // The reset link stays visible regardless.
    expect(wrapper.text()).toContain('Auf derz. gesp. Werte zurücksetzen')
  })

  it('still renders and allows removing an assigned item missing from available', async () => {
    // Regression guard: an item can be assigned-but-missing-from-available
    // for a real reason (e.g. an archived Instrument/Voice/Choirjob, since
    // `available` is filtered to active-only server-side). Before the fix,
    // the left column iterated `available` only, so a since-archived
    // assignment became invisible and unremovable.
    const archivedButAssigned = { id: 99, name: 'Serpent' }
    const wrapper = mount(SelectionSetup, {
      props: { available, modelValue: [available[0]!, archivedButAssigned] },
    })

    expect(wrapper.text()).toContain('Serpent')
    expect(wrapper.text()).toContain('nicht mehr aktiv')
    const trashIcons = wrapper.findAll('i.fa-trash')
    expect(trashIcons).toHaveLength(2)

    await trashIcons[1]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([available[0]])
  })

  it('does not mark a normally-assigned item as "nicht mehr aktiv"', () => {
    const wrapper = mount(SelectionSetup, {
      props: { available, modelValue: [available[0]!] },
    })

    expect(wrapper.text()).not.toContain('nicht mehr aktiv')
  })

  it('resets to the value it was mounted with, not to empty or current', async () => {
    const wrapper = mount(SelectionSetup, {
      props: { available, modelValue: [available[0]!] },
    })

    await wrapper.find('i.fa-trash').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([])

    await wrapper.find('small.c-pointer').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[1]?.[0]).toEqual([available[0]])
  })
})
