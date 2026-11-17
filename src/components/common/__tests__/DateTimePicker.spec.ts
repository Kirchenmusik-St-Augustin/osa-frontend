import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import DateTimePicker from '../DateTimePicker.vue'

// Fixed "now": Saturday 15 Aug 2026, 12:00. The earliest selectable instant is
// therefore Sunday 16 Aug 2026, 00:00 (tomorrow).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

// Mounts the picker as a real parent would: every emitted value is fed back
// in, so follow-up interactions see the updated model.
function mountPicker(modelValue: string): VueWrapper {
  const wrapper = mount(DateTimePicker, {
    props: {
      modelValue,
      'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
    },
    attachTo: document.body,
  })
  return wrapper
}

async function openPicker(wrapper: VueWrapper): Promise<void> {
  await wrapper.find('input.picker-input').trigger('click')
}

function lastEmitted(wrapper: VueWrapper): unknown {
  return wrapper.emitted('update:modelValue')?.at(-1)?.[0]
}

function dayButton(wrapper: VueWrapper, label: string) {
  return wrapper.find(`button.picker-day[aria-label="${label}"]`)
}

function monthSelect(wrapper: VueWrapper) {
  return wrapper.find('select[aria-label="Monat"]')
}

describe('DateTimePicker', () => {
  describe('editable and read-only state', () => {
    it('shows a future date in a readonly input with the weekday and German month', () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')

      const input = wrapper.find('input.picker-input')
      expect((input.element as HTMLInputElement).value).toBe('Do, 10. September 2026, 11:00')
      expect(input.attributes('readonly')).toBeDefined()
      expect(wrapper.text()).not.toContain('bereits vergangen')
    })

    it('renders a read-only fallback for a past date', () => {
      const wrapper = mountPicker('2026-08-01T11:00:00')

      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.find('[title="bereits vergangen"]').exists()).toBe(true)
    })

    // Regression: the read-only fallback must show the exact stored wall-clock
    // hour, never shifted by the viewer's UTC offset.
    it('does not shift the displayed hour of a past date', () => {
      const wrapper = mountPicker('2026-08-01T11:00:00')

      expect(wrapper.text()).toContain('11:00')
    })

    it('treats a later time today as read-only', () => {
      expect(mountPicker('2026-08-15T20:00:00').find('input').exists()).toBe(false)
    })

    it('treats exactly the first selectable instant as read-only and the next slot as editable', () => {
      expect(mountPicker('2026-08-16T00:00:00').find('input').exists()).toBe(false)
      expect(mountPicker('2026-08-16T00:15:00').find('input').exists()).toBe(true)
    })

    it('never renders a native date or time input', () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')

      expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(false)
      expect(wrapper.find('input[type="time"]').exists()).toBe(false)
    })
  })

  describe('opening and closing', () => {
    it('starts closed and toggles on a click on the input', async () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

      await openPicker(wrapper)
      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
      expect(wrapper.find('input.picker-input').attributes('aria-expanded')).toBe('true')

      await openPicker(wrapper)
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    })

    it.each(['enter', 'space'] as const)('opens on the %s key', async (key) => {
      const wrapper = mountPicker('2026-09-10T11:00:00')

      await wrapper.find('input.picker-input').trigger(`keydown.${key}`)

      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    })

    it('closes on Escape', async () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')
      await openPicker(wrapper)

      await wrapper.find('[role="dialog"]').trigger('keydown.esc')

      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    })

    it('closes on a click outside but stays open on a click inside', async () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')
      await openPicker(wrapper)

      await wrapper.find('select[aria-label="Stunde"]').trigger('click')
      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

      document.body.click()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    })
  })

  describe('calendar', () => {
    it('opens on the month of the value with the value marked', async () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')
      await openPicker(wrapper)

      expect((monthSelect(wrapper).element as HTMLSelectElement).value).toBe('9')
      expect((wrapper.find('input[aria-label="Jahr"]').element as HTMLInputElement).value).toBe(
        '2026',
      )
      expect(dayButton(wrapper, '10. September 2026').attributes('aria-pressed')).toBe('true')
      expect(dayButton(wrapper, '11. September 2026').attributes('aria-pressed')).toBe('false')
    })

    it('lists the weekdays Monday first and renders six weeks', async () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')
      await openPicker(wrapper)

      const weekdays = wrapper.findAll('.picker-weekday').map((node) => node.text())
      expect(weekdays).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
      expect(wrapper.findAll('button.picker-day')).toHaveLength(42)
    })

    it('picks a day and keeps the time', async () => {
      const wrapper = mountPicker('2026-09-10T11:45:00')
      await openPicker(wrapper)

      await dayButton(wrapper, '20. September 2026').trigger('click')

      expect(lastEmitted(wrapper)).toBe('2026-09-20T11:45:00')
      expect((wrapper.find('input.picker-input').element as HTMLInputElement).value).toBe(
        'So, 20. September 2026, 11:45',
      )
    })

    it('keeps the popup open after a pick so the time can be set next', async () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')
      await openPicker(wrapper)

      await dayButton(wrapper, '20. September 2026').trigger('click')

      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    })

    it('disables the days up to and including today and enables tomorrow', async () => {
      const wrapper = mountPicker('2026-08-20T11:00:00')
      await openPicker(wrapper)

      expect(dayButton(wrapper, '15. August 2026').attributes('disabled')).toBeDefined()
      expect(dayButton(wrapper, '16. August 2026').attributes('disabled')).toBeUndefined()
    })

    it('does not emit when a disabled day is clicked', async () => {
      const wrapper = mountPicker('2026-08-20T11:00:00')
      await openPicker(wrapper)

      await dayButton(wrapper, '15. August 2026').trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('picks a day of the neighbouring month and follows into that month', async () => {
      // The September 2026 grid starts on Monday 31 August.
      const wrapper = mountPicker('2026-09-10T11:00:00')
      await openPicker(wrapper)

      await dayButton(wrapper, '31. August 2026').trigger('click')

      expect(lastEmitted(wrapper)).toBe('2026-08-31T11:00:00')
      expect((monthSelect(wrapper).element as HTMLSelectElement).value).toBe('8')
    })
  })

  describe('navigation', () => {
    it('steps to the next and previous month', async () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')
      await openPicker(wrapper)

      await wrapper.find('button[aria-label="Folgemonat"]').trigger('click')
      expect((monthSelect(wrapper).element as HTMLSelectElement).value).toBe('10')

      await wrapper.find('button[aria-label="Vormonat"]').trigger('click')
      expect((monthSelect(wrapper).element as HTMLSelectElement).value).toBe('9')
    })

    it('disables the previous-month button in the earliest month', async () => {
      const wrapper = mountPicker('2026-08-20T11:00:00')
      await openPicker(wrapper)

      expect(wrapper.find('button[aria-label="Vormonat"]').attributes('disabled')).toBeDefined()
    })

    it('jumps to a month chosen in the month select', async () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')
      await openPicker(wrapper)

      await monthSelect(wrapper).setValue('12')

      expect(dayButton(wrapper, '24. Dezember 2026').exists()).toBe(true)
    })

    it('offers no selectable month before the earliest one', async () => {
      const wrapper = mountPicker('2026-08-20T11:00:00')
      await openPicker(wrapper)

      const disabled = monthSelect(wrapper)
        .findAll('option')
        .filter((option) => option.attributes('disabled') !== undefined)
        .map((option) => option.text())
      expect(disabled).toEqual(['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli'])
    })

    it('changes the year from the year field', async () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')
      await openPicker(wrapper)

      await wrapper.find('input[aria-label="Jahr"]').setValue('2027')

      expect(dayButton(wrapper, '14. September 2027').exists()).toBe(true)
    })

    it('rejects a year before the minimum and shows the year that is really displayed', async () => {
      const wrapper = mountPicker('2026-08-20T11:00:00')
      await openPicker(wrapper)

      const yearField = wrapper.find('input[aria-label="Jahr"]')
      await yearField.setValue('2020')

      expect((yearField.element as HTMLInputElement).value).toBe('2026')
      expect(dayButton(wrapper, '20. August 2026').exists()).toBe(true)
    })

    it('keeps the browsed month while the time is changed', async () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')
      await openPicker(wrapper)

      await wrapper.find('button[aria-label="Folgemonat"]').trigger('click')
      await wrapper.find('select[aria-label="Stunde"]').setValue('14')

      expect((monthSelect(wrapper).element as HTMLSelectElement).value).toBe('10')
    })
  })

  describe('time', () => {
    it('emits a changed hour and keeps date and minute', async () => {
      const wrapper = mountPicker('2026-09-10T11:15:00')
      await openPicker(wrapper)

      await wrapper.find('select[aria-label="Stunde"]').setValue('18')

      expect(lastEmitted(wrapper)).toBe('2026-09-10T18:15:00')
    })

    it('emits a changed minute and keeps date and hour', async () => {
      const wrapper = mountPicker('2026-09-10T11:15:00')
      await openPicker(wrapper)

      await wrapper.find('select[aria-label="Minute"]').setValue('45')

      expect(lastEmitted(wrapper)).toBe('2026-09-10T11:45:00')
    })

    it('offers 24 hours and the 15-minute grid', async () => {
      const wrapper = mountPicker('2026-09-10T11:00:00')
      await openPicker(wrapper)

      const hours = wrapper.findAll('select[aria-label="Stunde"] option')
      const minutes = wrapper.findAll('select[aria-label="Minute"] option').map((o) => o.text())
      expect(hours).toHaveLength(24)
      expect(hours[0]!.text()).toBe('00')
      expect(hours[23]!.text()).toBe('23')
      expect(minutes).toEqual(['00', '15', '30', '45'])
    })

    it('keeps an off-grid stored minute selectable instead of changing it', async () => {
      const wrapper = mountPicker('2026-09-10T10:07:00')
      await openPicker(wrapper)

      const minuteSelect = wrapper.find('select[aria-label="Minute"]')
      expect(minuteSelect.findAll('option').map((o) => o.text())).toEqual([
        '00',
        '07',
        '15',
        '30',
        '45',
      ])
      expect((minuteSelect.element as HTMLSelectElement).value).toBe('7')
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  describe('model sync', () => {
    it('re-syncs the field and the shown month when the parent changes the value', async () => {
      const wrapper = mountPicker('2026-09-10T09:00:00')
      await openPicker(wrapper)

      await wrapper.setProps({ modelValue: '2026-12-05T15:30:00' })

      expect((wrapper.find('input.picker-input').element as HTMLInputElement).value).toBe(
        'Sa, 5. Dezember 2026, 15:30',
      )
      expect((monthSelect(wrapper).element as HTMLSelectElement).value).toBe('12')
      expect((wrapper.find('select[aria-label="Stunde"]').element as HTMLSelectElement).value).toBe(
        '15',
      )
    })

    it('switches to the read-only fallback when the value becomes a past date', async () => {
      const wrapper = mountPicker('2026-09-10T09:00:00')

      await wrapper.setProps({ modelValue: '2026-08-01T09:00:00' })

      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.find('[title="bereits vergangen"]').exists()).toBe(true)
    })
  })
})
