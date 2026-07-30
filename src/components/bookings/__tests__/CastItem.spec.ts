import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CastItem from '../CastItem.vue'
import SingleCastList from '../SingleCastList.vue'
import type { BookableGroup, CastMember, Fee } from '@/composables/useBookings'

vi.mock('bootstrap', () => ({ Modal: vi.fn() }))

const bookable: BookableGroup = { requesting: [], other: [{ id: 5, name: 'Candidate' }] }
const fees: Fee[] = [{ id: 3, name: 'Instrumentalist', amount: 80 }]

function mountItem(cast: CastMember[], quantity: number) {
  return mount(CastItem, {
    props: {
      type: 'instruments',
      item: { id: 1, name: 'Violine', quantity },
      cast,
      bookable,
      allBooked: [],
      notBooked: [],
      fees,
    },
  })
}

describe('CastItem', () => {
  it('shows a green badge when cast count exactly matches quantity', () => {
    const wrapper = mountItem([{ id: 1, name: 'A', fee: 80 }], 1)
    expect(wrapper.find('.badge').classes()).toContain('text-bg-success')
    expect(wrapper.text()).toContain('1 / 1')
  })

  it('shows a red badge when understaffed', () => {
    const wrapper = mountItem([], 1)
    expect(wrapper.find('.badge').classes()).toContain('text-bg-danger')
  })

  it('shows a blue badge when overstaffed', () => {
    const wrapper = mountItem(
      [
        { id: 1, name: 'A', fee: 80 },
        { id: 2, name: 'B', fee: 80 },
      ],
      1,
    )
    expect(wrapper.find('.badge').classes()).toContain('text-bg-info')
  })

  it('toggles open/closed on header click, hiding details by default', async () => {
    const wrapper = mountItem([], 1)
    expect(wrapper.findComponent(SingleCastList).exists()).toBe(false)

    await wrapper.find('.c-pointer').trigger('click')
    expect(wrapper.findComponent(SingleCastList).exists()).toBe(true)
  })

  it('shows a reset link only after the cast actually changed, and reset restores it', async () => {
    const wrapper = mountItem([{ id: 1, name: 'A', fee: 80 }], 1)
    await wrapper.find('.d-flex.justify-content-between.c-pointer').trigger('click')
    expect(wrapper.text()).not.toContain('auf derz. Werte zurücksetzen')

    await wrapper.setProps({ cast: [] })
    expect(wrapper.text()).toContain('auf derz. Werte zurücksetzen')

    await wrapper.find('.text-end.mt-2.c-pointer small').trigger('click')
    expect(wrapper.emitted('cast-changed')?.slice(-1)[0]?.[1]).toEqual([
      { id: 1, name: 'A', fee: 80 },
    ])
  })
})
