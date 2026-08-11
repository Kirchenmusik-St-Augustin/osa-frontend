import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BookingStatusBadge from '../BookingStatusBadge.vue'
import type { BookingStatus } from '@/composables/useBookings'

function status(overrides: Partial<BookingStatus> = {}): BookingStatus {
  return { status: 1, position: null, at: null, ...overrides }
}

describe('BookingStatusBadge', () => {
  it('renders no badge for status 1 (bookable/unrequested)', () => {
    const wrapper = mount(BookingStatusBadge, { props: { status: status({ status: 1 }) } })
    expect(wrapper.find('.badge').exists()).toBe(false)
  })

  it('renders no badge for status 0 unless explainUnbookable is set', () => {
    const wrapper = mount(BookingStatusBadge, { props: { status: status({ status: 0 }) } })
    expect(wrapper.find('.badge').exists()).toBe(false)

    const explained = mount(BookingStatusBadge, {
      props: { status: status({ status: 0 }), explainUnbookable: true },
    })
    expect(explained.text()).toContain('nicht buchbar')
  })

  it('renders "Gebucht für <position>" in green for status 4', () => {
    const wrapper = mount(BookingStatusBadge, {
      props: { status: status({ status: 4, position: { id: 1, name: 'Violine 1' } }) },
    })
    expect(wrapper.text()).toContain('Gebucht für Violine 1')
    expect(wrapper.find('.badge').classes()).toContain('text-bg-success')
  })

  it('renders "Standby für <position>" for status 3', () => {
    const wrapper = mount(BookingStatusBadge, {
      props: { status: status({ status: 3, position: { id: 1, name: 'Violine 2' } }) },
    })
    expect(wrapper.text()).toContain('Standby für Violine 2')
  })

  it('does not render the trigger icon unless interactive', () => {
    const wrapper = mount(BookingStatusBadge, { props: { status: status({ status: 1 }) } })
    expect(wrapper.find('i.fas').exists()).toBe(false)
  })

  it('emits trigger when the interactive icon is clicked', async () => {
    const wrapper = mount(BookingStatusBadge, {
      props: { status: status({ status: 1 }), interactive: true },
    })
    await wrapper.find('i.fas').trigger('click')
    expect(wrapper.emitted('trigger')).toHaveLength(1)
  })

  it('renders no interactive icon for status 0 (no valid action)', () => {
    const wrapper = mount(BookingStatusBadge, {
      props: { status: status({ status: 0 }), interactive: true },
    })
    expect(wrapper.find('i.fas').exists()).toBe(false)
  })
})
