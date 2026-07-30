import { describe, expect, it } from 'vitest'
import {
  formatDateTime,
  formatDateTimeWithWeekday,
  formatMonthYear,
  parseWallClock,
  toWallClockString,
} from '../dateFormat'

describe('parseWallClock', () => {
  it('reads the string digits as literal wall-clock components, not a UTC instant', () => {
    const date = parseWallClock('2026-08-02T11:00:00')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(7)
    expect(date.getDate()).toBe(2)
    expect(date.getHours()).toBe(11)
    expect(date.getMinutes()).toBe(0)
    expect(date.getSeconds()).toBe(0)
  })

  it('accepts the space-separated backend format too', () => {
    expect(parseWallClock('2026-08-02 11:00:00').getHours()).toBe(11)
  })

  it('throws on an unparseable value', () => {
    expect(() => parseWallClock('not-a-date')).toThrow()
  })
})

describe('toWallClockString', () => {
  it('formats a Date back into the literal wall-clock digits, dropping milliseconds', () => {
    const date = new Date(2026, 7, 2, 11, 0, 0, 500)
    expect(toWallClockString(date)).toBe('2026-08-02T11:00:00')
  })

  // Regression: parseWallClock/toWallClockString must never round-trip
  // through a real UTC instant (e.g. via toISOString()) -- doing so shifts
  // the value by the viewer's UTC offset, which is exactly what broke the
  // July 2026 calendar by +2h under CEST before this fix.
  it('round-trips through parseWallClock without shifting the time', () => {
    const original = '2026-08-02T11:00:00'
    expect(toWallClockString(parseWallClock(original))).toBe(original)
  })
})

describe('formatDateTime', () => {
  it('renders day, short month, year and time', () => {
    expect(formatDateTime('2026-08-02T11:00:00')).toBe('2. Aug. 2026, 11:00')
  })

  it('zero-pads single-digit hours and minutes', () => {
    expect(formatDateTime('2026-01-05T09:05:00')).toBe('5. Jan. 2026, 09:05')
  })
})

describe('formatDateTimeWithWeekday', () => {
  it('renders weekday, day, full month, year and time', () => {
    // 2026-08-02 is a Sunday.
    expect(formatDateTimeWithWeekday('2026-08-02T11:00:00')).toBe('So, 2. August 2026, 11:00')
  })
})

describe('formatMonthYear', () => {
  it('renders full month name and year', () => {
    expect(formatMonthYear(2026, 7)).toBe('Juli 2026')
  })

  it('maps month 1 to January', () => {
    expect(formatMonthYear(2026, 1)).toBe('Januar 2026')
  })
})
