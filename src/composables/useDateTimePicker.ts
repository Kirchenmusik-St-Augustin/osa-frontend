import { computed, ref, watch, type ComputedRef, type Ref, type WritableComputedRef } from 'vue'
import { buildMonthGrid, type CalendarCell } from '@/services/calendarGrid'
import { MONTHS_FULL, parseWallClock, toWallClockString } from '@/services/dateFormat'

// State and rules of the date-time picker, kept free of any DOM so they are
// testable on their own. The single source of truth is the model: a naive
// wall-clock string (see dateFormat.ts), exactly the wire format of the
// backend's `schedule` fields. Every pick writes a new string straight back
// to it; the only state of its own is which month the calendar is showing.

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
// The 15-minute grid. A stored time that is off the grid (legacy data such as
// 10:07) is added to the options of the minute list, so opening the picker
// never silently changes it.
const MINUTE_GRID = [0, 15, 30, 45]

export interface MonthChoice {
  value: number
  label: string
  disabled: boolean
}

export interface DateTimePickerState {
  viewYear: Ref<number>
  viewMonth: Ref<number>
  grid: ComputedRef<CalendarCell[]>
  monthChoices: ComputedRef<MonthChoice[]>
  minYear: number
  canGoPrevious: ComputedRef<boolean>
  hourOptions: number[]
  minuteOptions: ComputedRef<number[]>
  hour: WritableComputedRef<number>
  minute: WritableComputedRef<number>
  isDayDisabled: (cell: CalendarCell) => boolean
  isSelected: (cell: CalendarCell) => boolean
  selectDay: (cell: CalendarCell) => void
  showMonth: (year: number, month: number) => void
  shiftMonth: (delta: number) => void
  setViewYear: (year: number) => void
}

// Position of a month on one continuous scale, so "before the earliest
// month" is a plain number comparison across year boundaries.
function monthIndex(year: number, month: number): number {
  return year * 12 + month - 1
}

// `minDate` is the first selectable instant (local midnight); everything
// before it is disabled and can neither be picked nor navigated to.
export function useDateTimePicker(model: Ref<string>, minDate: Date): DateTimePickerState {
  const selected = computed(() => parseWallClock(model.value))
  const viewYear = ref(selected.value.getFullYear())
  const viewMonth = ref(selected.value.getMonth() + 1)
  const minMonthIndex = monthIndex(minDate.getFullYear(), minDate.getMonth() + 1)

  function showMonth(year: number, month: number): void {
    // Date normalises an overflowing month (0 or 13) into the right year.
    const target = new Date(year, month - 1, 1)
    const index = Math.max(monthIndex(target.getFullYear(), target.getMonth() + 1), minMonthIndex)
    viewYear.value = Math.floor(index / 12)
    viewMonth.value = (index % 12) + 1
  }

  // Follow the model when it moves to another month (an outside-month day was
  // picked, or the parent replaced the value). Picking within the shown month
  // or changing the time leaves the view where the user put it.
  watch(
    () => monthIndex(selected.value.getFullYear(), selected.value.getMonth() + 1),
    () => showMonth(selected.value.getFullYear(), selected.value.getMonth() + 1),
  )

  const grid = computed(() => buildMonthGrid(viewYear.value, viewMonth.value))

  const monthChoices = computed<MonthChoice[]>(() =>
    MONTHS_FULL.map((label, index) => ({
      value: index + 1,
      label,
      disabled: monthIndex(viewYear.value, index + 1) < minMonthIndex,
    })),
  )

  const canGoPrevious = computed(() => monthIndex(viewYear.value, viewMonth.value) > minMonthIndex)

  const minuteOptions = computed(() =>
    [...new Set([...MINUTE_GRID, selected.value.getMinutes()])].sort((a, b) => a - b),
  )

  function write(year: number, month: number, day: number, hours: number, minutes: number): void {
    // Seconds are carried over: the picker only edits date, hour and minute.
    model.value = toWallClockString(
      new Date(year, month - 1, day, hours, minutes, selected.value.getSeconds()),
    )
  }

  // Changes the time of the currently selected day.
  function writeTime(hours: number, minutes: number): void {
    const current = selected.value
    write(current.getFullYear(), current.getMonth() + 1, current.getDate(), hours, minutes)
  }

  const hour = computed({
    get: () => selected.value.getHours(),
    set: (hours: number) => writeTime(hours, selected.value.getMinutes()),
  })

  const minute = computed({
    get: () => selected.value.getMinutes(),
    set: (minutes: number) => writeTime(selected.value.getHours(), minutes),
  })

  function isDayDisabled(cell: CalendarCell): boolean {
    return new Date(cell.year, cell.month - 1, cell.day).getTime() < minDate.getTime()
  }

  function isSelected(cell: CalendarCell): boolean {
    const current = selected.value
    return (
      cell.year === current.getFullYear() &&
      cell.month === current.getMonth() + 1 &&
      cell.day === current.getDate()
    )
  }

  function selectDay(cell: CalendarCell): void {
    if (isDayDisabled(cell)) return
    const current = selected.value
    write(cell.year, cell.month, cell.day, current.getHours(), current.getMinutes())
  }

  function shiftMonth(delta: number): void {
    showMonth(viewYear.value, viewMonth.value + delta)
  }

  function setViewYear(year: number): void {
    if (!Number.isInteger(year)) return
    showMonth(year, viewMonth.value)
  }

  return {
    viewYear,
    viewMonth,
    grid,
    monthChoices,
    minYear: minDate.getFullYear(),
    canGoPrevious,
    hourOptions: HOURS,
    minuteOptions,
    hour,
    minute,
    isDayDisabled,
    isSelected,
    selectDay,
    showMonth,
    shiftMonth,
    setViewYear,
  }
}
