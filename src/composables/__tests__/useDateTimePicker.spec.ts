import { nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useDateTimePicker } from '../useDateTimePicker'
import type { CalendarCell } from '@/services/calendarGrid'

// "Today" is Saturday 15 Aug 2026, so the first selectable instant is
// Sunday 16 Aug 2026, 00:00 (the picker's own rule: tomorrow).
const MIN_DATE = new Date(2026, 7, 16, 0, 0, 0, 0)

function createPicker(initial = '2026-09-10T11:00:00') {
  const model = ref(initial)
  const picker = useDateTimePicker(model, MIN_DATE)
  return { model, picker }
}

function cell(year: number, month: number, day: number, inMonth = true): CalendarCell {
  return { year, month, day, inMonth }
}

describe('useDateTimePicker', () => {
  describe('initial view', () => {
    it('shows the month of the selected value', () => {
      const { picker } = createPicker('2026-11-30T09:00:00')

      expect(picker.viewYear.value).toBe(2026)
      expect(picker.viewMonth.value).toBe(11)
      expect(picker.grid.value).toHaveLength(42)
    })

    it('exposes the year of the earliest selectable day', () => {
      expect(createPicker().picker.minYear).toBe(2026)
    })
  })

  describe('selectDay', () => {
    it('writes the picked day with the current time as a wall-clock string', () => {
      const { model, picker } = createPicker('2026-09-10T11:45:00')

      picker.selectDay(cell(2026, 9, 21))

      expect(model.value).toBe('2026-09-21T11:45:00')
    })

    it('keeps the seconds of the stored value', () => {
      const { model, picker } = createPicker('2026-09-10T11:00:30')

      picker.selectDay(cell(2026, 9, 21))

      expect(model.value).toBe('2026-09-21T11:00:30')
    })

    it('ignores a day before the earliest selectable one', () => {
      const { model, picker } = createPicker()

      picker.selectDay(cell(2026, 8, 15))

      expect(model.value).toBe('2026-09-10T11:00:00')
    })

    it('accepts the earliest selectable day itself', () => {
      const { model, picker } = createPicker()

      picker.selectDay(cell(2026, 8, 16))

      expect(model.value).toBe('2026-08-16T11:00:00')
    })
  })

  describe('isDayDisabled / isSelected', () => {
    it('disables exactly the days before the minimum', () => {
      const { picker } = createPicker()

      expect(picker.isDayDisabled(cell(2026, 8, 15))).toBe(true)
      expect(picker.isDayDisabled(cell(2026, 8, 16))).toBe(false)
      expect(picker.isDayDisabled(cell(2027, 1, 1))).toBe(false)
    })

    it('marks only the selected day, across month borders', () => {
      const { picker } = createPicker('2026-09-30T11:00:00')

      expect(picker.isSelected(cell(2026, 9, 30))).toBe(true)
      expect(picker.isSelected(cell(2026, 9, 29))).toBe(false)
      expect(picker.isSelected(cell(2026, 10, 30))).toBe(false)
      expect(picker.isSelected(cell(2025, 9, 30))).toBe(false)
    })
  })

  describe('time', () => {
    it('writes a new hour and keeps date and minute', () => {
      const { model, picker } = createPicker('2026-09-10T11:15:00')

      picker.hour.value = 18

      expect(model.value).toBe('2026-09-10T18:15:00')
      expect(picker.hour.value).toBe(18)
    })

    it('writes a new minute and keeps date and hour', () => {
      const { model, picker } = createPicker('2026-09-10T11:15:00')

      picker.minute.value = 45

      expect(model.value).toBe('2026-09-10T11:45:00')
    })

    it('offers 24 hours', () => {
      const { picker } = createPicker()

      expect(picker.hourOptions).toHaveLength(24)
      expect(picker.hourOptions[0]).toBe(0)
      expect(picker.hourOptions.at(-1)).toBe(23)
    })

    it('offers the 15-minute grid', () => {
      expect(createPicker().picker.minuteOptions.value).toEqual([0, 15, 30, 45])
    })

    it('adds an off-grid stored minute so opening the picker does not alter it', () => {
      const { picker } = createPicker('2026-09-10T10:07:00')

      expect(picker.minuteOptions.value).toEqual([0, 7, 15, 30, 45])
      expect(picker.minute.value).toBe(7)
    })
  })

  describe('month navigation', () => {
    it('moves forward and backward across a year boundary', () => {
      const { picker } = createPicker('2026-12-05T11:00:00')

      picker.shiftMonth(1)
      expect([picker.viewYear.value, picker.viewMonth.value]).toEqual([2027, 1])

      picker.shiftMonth(-1)
      expect([picker.viewYear.value, picker.viewMonth.value]).toEqual([2026, 12])
    })

    it('does not navigate before the month of the minimum', () => {
      const { picker } = createPicker('2026-09-10T11:00:00')

      picker.shiftMonth(-1)
      expect(picker.viewMonth.value).toBe(8)
      expect(picker.canGoPrevious.value).toBe(false)

      picker.shiftMonth(-1)
      expect([picker.viewYear.value, picker.viewMonth.value]).toEqual([2026, 8])
    })

    it('allows going back while later than the minimum month', () => {
      expect(createPicker('2026-09-10T11:00:00').picker.canGoPrevious.value).toBe(true)
    })

    it('clamps a requested month before the minimum to the minimum month', () => {
      const { picker } = createPicker('2026-09-10T11:00:00')

      picker.showMonth(2026, 2)

      expect([picker.viewYear.value, picker.viewMonth.value]).toEqual([2026, 8])
    })

    it('normalises an overflowing month into the neighbouring year', () => {
      const { picker } = createPicker('2026-09-10T11:00:00')

      picker.showMonth(2026, 13)

      expect([picker.viewYear.value, picker.viewMonth.value]).toEqual([2027, 1])
    })

    it('disables the months before the minimum only in the minimum year', () => {
      const { picker } = createPicker('2026-08-20T11:00:00')

      const disabledNow = picker.monthChoices.value.filter((c) => c.disabled).map((c) => c.value)
      expect(disabledNow).toEqual([1, 2, 3, 4, 5, 6, 7])

      picker.setViewYear(2027)
      expect(picker.monthChoices.value.some((c) => c.disabled)).toBe(false)
      expect(picker.monthChoices.value[0]).toEqual({ value: 1, label: 'Januar', disabled: false })
    })
  })

  describe('setViewYear', () => {
    it('keeps the month and changes the year', () => {
      const { picker } = createPicker('2026-09-10T11:00:00')

      picker.setViewYear(2028)

      expect([picker.viewYear.value, picker.viewMonth.value]).toEqual([2028, 9])
    })

    it('clamps a year before the minimum to the minimum month', () => {
      const { picker } = createPicker('2026-09-10T11:00:00')

      picker.setViewYear(2020)

      expect([picker.viewYear.value, picker.viewMonth.value]).toEqual([2026, 8])
    })

    it.each([Number.NaN, 2027.5, Number.POSITIVE_INFINITY])(
      'ignores the non-integer year %s',
      (year) => {
        const { picker } = createPicker('2026-09-10T11:00:00')

        picker.setViewYear(year)

        expect([picker.viewYear.value, picker.viewMonth.value]).toEqual([2026, 9])
      },
    )
  })

  describe('following the model', () => {
    it('jumps to the new month when the model moves to another month', async () => {
      const { model, picker } = createPicker('2026-09-10T11:00:00')

      model.value = '2027-02-03T09:00:00'
      await nextTick()

      expect([picker.viewYear.value, picker.viewMonth.value]).toEqual([2027, 2])
    })

    it('keeps a browsed month when only the time changes', async () => {
      const { picker } = createPicker('2026-09-10T11:00:00')

      picker.shiftMonth(2)
      picker.hour.value = 14
      await nextTick()

      expect(picker.viewMonth.value).toBe(11)
    })

    it('follows an outside-month day that was picked', async () => {
      const { picker } = createPicker('2026-09-10T11:00:00')

      picker.selectDay(cell(2026, 10, 1, false))
      await nextTick()

      expect(picker.viewMonth.value).toBe(10)
    })
  })
})
