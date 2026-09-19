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

  it('renders "angefragt" in a warning badge for status 2', () => {
    const wrapper = mount(BookingStatusBadge, {
      props: { status: status({ status: 2, position: { id: '1', name: 'Violine 1' } }) },
    })
    expect(wrapper.text()).toContain('angefragt')
    expect(wrapper.find('.badge').classes()).toContain('text-bg-warning')
  })

  it('renders "nicht gebucht" in a danger badge for status 5', () => {
    const wrapper = mount(BookingStatusBadge, { props: { status: status({ status: 5 }) } })
    expect(wrapper.text()).toContain('nicht gebucht')
    expect(wrapper.find('.badge').classes()).toContain('text-bg-danger')
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

  it('shows the "request" icon and color for status 1', () => {
    const wrapper = mount(BookingStatusBadge, {
      props: { status: status({ status: 1 }), interactive: true },
    })
    const icon = wrapper.find('i.fas')
    expect(icon.classes()).toContain('fa-hand-point-up')
    expect(icon.classes()).toContain('text-danger')
    expect(icon.classes()).not.toContain('fa-times-circle')
  })

  it.each([2, 3, 4, 5])('shows the "cancel" icon and color for status %i', (statusCode) => {
    const wrapper = mount(BookingStatusBadge, {
      props: { status: status({ status: statusCode }), interactive: true },
    })
    const icon = wrapper.find('i.fas')
    expect(icon.classes()).toContain('fa-times-circle')
    expect(icon.classes()).toContain('text-secondary')
    expect(icon.classes()).not.toContain('fa-hand-point-up')
  })

  it.each([
    [1, 'Buchung anfragen'],
    [2, 'Anfrage stornieren'],
    [3, 'Standby stornieren'],
    [4, 'Buchung stornieren'],
    [5, 'Anfrage stornieren'],
  ])('titles the trigger icon of status %i "%s"', (statusCode, expectedTitle) => {
    const wrapper = mount(BookingStatusBadge, {
      props: { status: status({ status: statusCode }), interactive: true },
    })
    expect(wrapper.find('i.fas').attributes('title')).toBe(expectedTitle)
  })
})
