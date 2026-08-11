import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SingleCastList from '../SingleCastList.vue'
import type { CastMember, NotBookedEntry } from '@/composables/useBookings'

function cast(): CastMember[] {
  return [
    { id: 1, name: 'Regular', fee: 80 },
    { id: 2, name: 'Standby', fee: 80 },
  ]
}

function notBooked(): NotBookedEntry[] {
  return [{ id: 3, name: 'REJECTED, Kandidat' }]
}

describe('SingleCastList', () => {
  it('marks entries within `required` as regular (green/bold), rest as standby (blue)', () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const rows = wrapper.findAll('small')
    expect(rows[0]?.classes()).toContain('text-success')
    expect(rows[1]?.classes()).toContain('text-info')
  })

  it('emits cast-changed with entries swapped on move up/down', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const downArrows = wrapper.findAll('.fa-arrow-down')
    await downArrows[0]?.trigger('click')
    expect(wrapper.emitted('cast-changed')?.[0]?.[0]).toEqual([
      { id: 2, name: 'Standby', fee: 80 },
      { id: 1, name: 'Regular', fee: 80 },
    ])
  })

  it('does not emit when moving beyond the boundary', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const upArrows = wrapper.findAll('.fa-arrow-up')
    await upArrows[0]?.trigger('click') // first entry, already at top
    expect(wrapper.emitted('cast-changed')).toBeUndefined()
  })

  it('emits cast-changed without the removed entry', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const removeIcons = wrapper.findAll('.fa-times')
    await removeIcons[0]?.trigger('click')
    expect(wrapper.emitted('cast-changed')?.[0]?.[0]).toEqual([{ id: 2, name: 'Standby', fee: 80 }])
  })

  it('renders its own "nicht gebucht" section when notBooked entries are passed', () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: notBooked() },
    })
    expect(wrapper.text()).toContain('nicht gebucht:')
    expect(wrapper.text()).toContain('REJECTED, Kandidat')
  })

  it('omits the "nicht gebucht" section entirely when there is nothing not booked', () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    expect(wrapper.text()).not.toContain('nicht gebucht')
  })

  it('emits remove-not-booked with the entry id, not cast-changed', async () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: notBooked() },
    })
    const notBookedRemoveIcon = wrapper.findAll('.fa-times').at(-1)
    await notBookedRemoveIcon?.trigger('click')
    expect(wrapper.emitted('remove-not-booked')?.[0]).toEqual([3])
    expect(wrapper.emitted('cast-changed')).toBeUndefined()
  })
})
