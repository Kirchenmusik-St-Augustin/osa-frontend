import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SingleCastSelector from '../SingleCastSelector.vue'
import type { BookableGroup, Fee } from '@/composables/useBookings'

vi.mock('bootstrap', () => ({ Modal: vi.fn() }))

const bookable: BookableGroup = {
  requesting: [{ id: 1, name: 'Requester' }],
  other: [
    { id: 2, name: 'Other' },
    { id: 3, name: 'AlreadyBooked' },
  ],
}
const fees: Fee[] = [
  { id: 1, name: 'Chor', amount: 0 },
  { id: 3, name: 'Instrumentalist', amount: 80 },
]

describe('SingleCastSelector', () => {
  it('excludes already-booked and not-booked users from the candidate lists', () => {
    const wrapper = mount(SingleCastSelector, {
      props: {
        allBooked: [{ id: 3, name: 'AlreadyBooked' }],
        notBooked: [],
        bookable,
        fees,
        modalId: 'instruments-1',
      },
    })
    expect(wrapper.text()).not.toContain('AlreadyBooked')
    expect(wrapper.text()).toContain('Other')
  })

  it('defaults the fee selection to id 3 when present', () => {
    const wrapper = mount(SingleCastSelector, {
      props: { allBooked: [], notBooked: [], bookable, fees, modalId: 'instruments-1' },
    })
    const select = wrapper.find('select').element as HTMLSelectElement
    expect(select.value).toBe('3')
  })

  it('emits add-to with stack "cast" and the selected fee amount on hinzufügen', async () => {
    const wrapper = mount(SingleCastSelector, {
      props: { allBooked: [], notBooked: [], bookable, fees, modalId: 'instruments-1' },
    })
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('button.btn-primary').trigger('click')

    const emitted = wrapper.emitted('add-to')
    expect(emitted).toHaveLength(1)
    expect(emitted?.[0]?.[0]).toMatchObject({
      stack: 'cast',
      candidates: [{ id: 1, name: 'Requester', fee: 80 }],
    })
  })

  it('emits add-to with stack "notBooked" on zurückweisen', async () => {
    const wrapper = mount(SingleCastSelector, {
      props: { allBooked: [], notBooked: [], bookable, fees, modalId: 'instruments-1' },
    })
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('button.btn-secondary').trigger('click')

    const emitted = wrapper.emitted('add-to')
    expect(emitted?.[0]?.[0]).toMatchObject({ stack: 'notBooked' })
  })

  it('shows the popular star button only when a popular prop is supplied', () => {
    const withoutPopular = mount(SingleCastSelector, {
      props: { allBooked: [], notBooked: [], bookable, fees, modalId: 'instruments-1' },
    })
    expect(withoutPopular.find('.fa-star').exists()).toBe(false)

    const withPopular = mount(SingleCastSelector, {
      props: {
        allBooked: [],
        notBooked: [],
        bookable,
        fees,
        modalId: 'instruments-1',
        popular: { frequent: [], recent: [] },
      },
    })
    expect(withPopular.find('.fa-star').exists()).toBe(true)
  })
})
