import { describe, expect, it } from 'vitest'
import { buildMonthGrid, WEEKDAYS_MONDAY_FIRST } from '../calendarGrid'

describe('buildMonthGrid', () => {
  it('always returns six full weeks', () => {
    expect(buildMonthGrid(2026, 2)).toHaveLength(42)
    expect(buildMonthGrid(2026, 8)).toHaveLength(42)
  })

  it('starts on the Monday of the week containing the 1st (month starts on a Thursday)', () => {
    // 1 Oct 2026 is a Thursday -> three leading days from September.
    const grid = buildMonthGrid(2026, 10)

    expect(grid.slice(0, 4)).toEqual([
      { year: 2026, month: 9, day: 28, inMonth: false },
      { year: 2026, month: 9, day: 29, inMonth: false },
      { year: 2026, month: 9, day: 30, inMonth: false },
      { year: 2026, month: 10, day: 1, inMonth: true },
    ])
  })

  it('has no leading days when the 1st is a Monday', () => {
    // 1 Sep 2025 is a Monday.
    expect(buildMonthGrid(2025, 9)[0]).toEqual({ year: 2025, month: 9, day: 1, inMonth: true })
  })

  it('has six leading days when the 1st is a Sunday', () => {
    // 1 Feb 2026 is a Sunday -> the grid starts on Monday 26 Jan.
    const grid = buildMonthGrid(2026, 2)

    expect(grid[0]).toEqual({ year: 2026, month: 1, day: 26, inMonth: false })
    expect(grid[6]).toEqual({ year: 2026, month: 2, day: 1, inMonth: true })
  })

  it('marks exactly the days of the month as inMonth, including 29 February in a leap year', () => {
    const leap = buildMonthGrid(2028, 2).filter((cell) => cell.inMonth)
    const regular = buildMonthGrid(2027, 2).filter((cell) => cell.inMonth)

    expect(leap.map((cell) => cell.day)).toEqual(Array.from({ length: 29 }, (_, i) => i + 1))
    expect(regular).toHaveLength(28)
  })

  it('rolls trailing days of December into January of the next year', () => {
    const last = buildMonthGrid(2026, 12).at(-1)

    // 1 Dec 2026 is a Tuesday -> the grid starts on 30 Nov and ends on 10 Jan.
    expect(last).toEqual({ year: 2027, month: 1, day: 10, inMonth: false })
  })

  it('rolls leading days of January into December of the previous year', () => {
    // 1 Jan 2027 is a Friday -> four leading days from December 2026.
    expect(buildMonthGrid(2027, 1)[0]).toEqual({ year: 2026, month: 12, day: 28, inMonth: false })
  })

  it('lists the weekday labels Monday first', () => {
    expect(WEEKDAYS_MONDAY_FIRST).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
  })
})
