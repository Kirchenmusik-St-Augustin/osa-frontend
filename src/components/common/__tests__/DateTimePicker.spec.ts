import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DateTimePicker from '../DateTimePicker.vue'
import { toWallClockString } from '@/services/dateFormat'

describe('DateTimePicker', () => {
  it('renders an editable picker for a future date', () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    const iso = toWallClockString(future)

    const wrapper = mount(DateTimePicker, { props: { modelValue: iso } })

    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('bereits vergangen')
  })

  it('renders a read-only fallback for a past date', () => {
    const past = new Date()
    past.setDate(past.getDate() - 30)
    const iso = toWallClockString(past)

    const wrapper = mount(DateTimePicker, { props: { modelValue: iso } })

    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('[title="bereits vergangen"]').exists()).toBe(true)
  })

  // Regression: the read-only fallback must show the exact stored wall-clock
  // hour, never shifted by the viewer's UTC offset (this broke by +2h under
  // CEST before the parseWallClock/toWallClockString fix).
  it('does not shift the displayed hour for a past date', () => {
    const past = new Date()
    past.setDate(past.getDate() - 30)
    past.setHours(11, 0, 0, 0)
    const iso = toWallClockString(past)

    const wrapper = mount(DateTimePicker, { props: { modelValue: iso } })

    expect(wrapper.text()).toContain('11:00')
  })
})
