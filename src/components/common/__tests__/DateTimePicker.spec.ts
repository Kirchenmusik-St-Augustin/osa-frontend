import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DateTimePicker from '../DateTimePicker.vue'
import { toWallClockString } from '@/services/dateFormat'

// vue-flatpickr-component's real onClose()/onInput() handlers emit a
// formatted STRING via update:modelValue, never a Date object (see its
// source) -- stubbed minimally instead of driving the real, native
// calendar-popup widget, so the regression test below can trigger that
// exact emission shape directly.
vi.mock('vue-flatpickr-component', () => ({
  default: {
    name: 'FlatPickr',
    props: ['modelValue', 'config'],
    emits: ['update:modelValue'],
    template:
      '<input class="flatpickr-stub" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
}))

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

  it('propagates a raw date STRING emitted by Flatpickr back to the v-model as a wall-clock string', async () => {
    // Regression: vue-flatpickr-component emits a string (not a Date) via
    // update:modelValue -- treating it as a Date and calling
    // toWallClockString()/getTime() on it threw silently inside the
    // internal watcher, which is what dropped every date change made
    // through this picker (both the performance's own schedule and each
    // rehearsal's own schedule use this component).
    const iso = toWallClockString(new Date(2026, 8, 6, 11, 0, 0))
    const wrapper = mount(DateTimePicker, { props: { modelValue: iso } })

    await wrapper.find('.flatpickr-stub').setValue('2026-09-08 14:30:00')

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('2026-09-08T14:30:00')
  })
})
