import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CastItem from '../CastItem.vue'
import SingleCastList from '../SingleCastList.vue'
import type { BookableGroup, CastMember, Fee } from '@/composables/useBookings'

vi.mock('bootstrap', () => ({ Modal: vi.fn() }))

const bookable: BookableGroup = { requesting: [], other: [{ id: 5, name: 'Candidate' }] }
const fees: Fee[] = [{ id: 3, name: 'Instrumentalist', amount: 80 }]

function mountItem(cast: CastMember[], quantity: number, extra: Record<string, unknown> = {}) {
  return mount(CastItem, {
    ...extra,
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
    const wrapper = mountItem([], 1, { attachTo: document.body })
    // Legacy uses v-show (not v-if) for the expanded panel, so it stays
    // mounted -- just hidden -- to preserve the selector's own state
    // (selected candidates, chosen Fee) across collapse/expand cycles.
    expect(wrapper.findComponent(SingleCastList).exists()).toBe(true)
    expect(wrapper.findComponent(SingleCastList).isVisible()).toBe(false)

    await wrapper.find('.c-pointer').trigger('click')
    expect(wrapper.findComponent(SingleCastList).isVisible()).toBe(true)
    wrapper.unmount()
  })

  it('only visually hides the reset link until the cast changed, keeping its line height reserved', async () => {
    // Legacy keeps the wrapping line always in the layout (its own pug
    // reserves the row via a permanent &nbsp;, toggling only the link text)
    // to avoid the page jumping when the link appears/disappears -- ported
    // here via Bootstrap's `.invisible` (visibility:hidden, space kept)
    // instead of removing the row from the DOM (v-if would collapse it).
    const wrapper = mountItem([{ id: 1, name: 'A', fee: 80 }], 1)
    await wrapper.find('.d-flex.justify-content-between.c-pointer').trigger('click')
    expect(wrapper.find('.mt-3.small.text-end').classes()).toContain('invisible')

    await wrapper.setProps({ cast: [] })
    expect(wrapper.find('.mt-3.small.text-end').classes()).not.toContain('invisible')

    const resetLink = wrapper
      .findAll('small')
      .find((small) => small.text() === 'auf derz. Werte zurücksetzen')
    await resetLink?.trigger('click')
    expect(wrapper.emitted('cast-changed')?.slice(-1)[0]?.[1]).toEqual([
      { id: 1, name: 'A', fee: 80 },
    ])
  })

  it('renders its notBooked prop inside SingleCastList and bubbles remove-not-booked up', async () => {
    const wrapper = mountItem([], 1, { attachTo: document.body })
    await wrapper.setProps({ notBooked: [{ id: 9, name: 'REJECTED, Kandidat' }] })
    await wrapper.find('.c-pointer').trigger('click') // expand
    expect(wrapper.text()).toContain('REJECTED, Kandidat')

    await wrapper.find('.fa-times').trigger('click')
    expect(wrapper.emitted('remove-not-booked')?.[0]).toEqual([9])
    wrapper.unmount()
  })
})
