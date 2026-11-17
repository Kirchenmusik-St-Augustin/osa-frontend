// Pure month-grid arithmetic for the date-time picker: no Vue, no timers, no
// browser APIs besides Date's local-time constructor, so every edge (leap
// February, a month starting on a Monday or Sunday, the year change in
// December/January) is covered by plain unit tests.

export interface CalendarCell {
  year: number
  // 1-based, like the month everywhere else in this project (formatMonthYear).
  month: number
  day: number
  // False for the leading/trailing days that belong to the neighbouring months
  // and only fill the first and last week.
  inMonth: boolean
}

export const WEEKDAYS_MONDAY_FIRST = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

const DAYS_PER_WEEK = 7
// Six weeks cover every month in a Monday-first layout, and a fixed row count
// keeps the popup from changing its height while navigating.
const GRID_WEEKS = 6

// All 42 cells of the month's grid, starting on the Monday of the week that
// contains the 1st. Dates come from the Date constructor's own overflow
// handling (day 0 / day 32 roll into the neighbouring month), which is what
// keeps leap years and year boundaries correct without any lookup table.
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const leadingDays = (firstWeekday + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK

  return Array.from({ length: DAYS_PER_WEEK * GRID_WEEKS }, (_, index) => {
    const date = new Date(year, month - 1, 1 - leadingDays + index)
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      inMonth: date.getMonth() === month - 1,
    }
  })
}
