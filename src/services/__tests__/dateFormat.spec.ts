import { describe, expect, it } from 'vitest'
import {
  formatDateOnly,
  formatDateTime,
  formatDateTimeWithWeekday,
  formatDayMonthYear,
  formatMonthYear,
  formatTimeOnly,
  formatUtcDateTime,
  parseCalendarDate,
  parseUtcInstantDate,
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

describe('formatUtcDateTime', () => {
  // Deliberately timezone-agnostic (no hardcoded expected wall-clock
  // string) -- Vitest may run in any container TZ, only the *mechanism*
  // (real offset-aware parsing) is under test here, not one fixed offset.
  it('renders the same wall-clock time for two ISO strings representing the same instant', () => {
    expect(formatUtcDateTime('2023-12-28T16:50:00+00:00')).toBe(
      formatUtcDateTime('2023-12-28T18:50:00+02:00'),
    )
  })

  it('honors the offset instead of reading the raw digits like parseWallClock does', () => {
    // Identical digits, different offset -- five hours apart in reality.
    // formatDateTime (parseWallClock) would render both identically since
    // it ignores the offset entirely; formatUtcDateTime must not.
    const zulu = '2026-06-15T12:00:00Z'
    const withOffset = '2026-06-15T12:00:00+05:00'
    expect(formatUtcDateTime(zulu)).not.toBe(formatUtcDateTime(withOffset))
    expect(formatDateTime(zulu)).toBe(formatDateTime(withOffset))
  })
})

describe('parseUtcInstantDate', () => {
  it('extracts the same calendar parts for two ISO strings representing the same instant', () => {
    expect(parseUtcInstantDate('2023-12-28T23:50:00+00:00')).toEqual(
      parseUtcInstantDate('2023-12-29T01:50:00+02:00'),
    )
  })

  it('extracts year/month/day as 1-based month, mirroring parseCalendarDate', () => {
    const result = parseUtcInstantDate(new Date(2026, 5, 12, 10, 0, 0).toISOString())
    expect(result).toEqual({ year: 2026, month: 6, day: 12 })
  })
})

describe('formatDateOnly', () => {
  it('renders the same calendar date for two ISO strings representing the same instant', () => {
    expect(formatDateOnly('2026-06-12T10:00:00+00:00')).toBe(
      formatDateOnly('2026-06-12T12:00:00+02:00'),
    )
  })

  it('renders day, full month name and year, no time', () => {
    const result = formatDateOnly(new Date(2026, 5, 12, 10, 0, 0).toISOString())
    expect(result).toBe('12. Juni 2026')
  })
})

describe('formatTimeOnly', () => {
  it('renders the same wall-clock time for two ISO strings representing the same instant', () => {
    expect(formatTimeOnly('2026-06-12T10:05:30+00:00')).toBe(
      formatTimeOnly('2026-06-12T12:05:30+02:00'),
    )
  })

  it('renders zero-padded HH:mm:ss', () => {
    const result = formatTimeOnly(new Date(2026, 5, 12, 9, 5, 3).toISOString())
    expect(result).toBe('09:05:03')
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

describe('formatDayMonthYear', () => {
  it('renders day, full month name and year', () => {
    expect(formatDayMonthYear(2026, 8, 12)).toBe('12. August 2026')
  })

  it('maps month 1 to January', () => {
    expect(formatDayMonthYear(2026, 1, 5)).toBe('5. Januar 2026')
  })
})

describe('parseCalendarDate', () => {
  it('splits a "YYYY-MM-DD" string into numeric parts', () => {
    expect(parseCalendarDate('2026-08-12')).toEqual({ year: 2026, month: 8, day: 12 })
  })

  it('never goes through a Date construction (no UTC-offset reinterpretation risk)', () => {
    // Regression guard for the bug class this function exists to avoid --
    // `new Date('2026-08-12')` parses as UTC midnight and can shift by a
    // day under a negative browser UTC offset. A pure string-split has no
    // such risk; this asserts the day survives unchanged either way.
    expect(parseCalendarDate('2026-01-01').day).toBe(1)
  })

  it('throws on an unparseable value', () => {
    expect(() => parseCalendarDate('not-a-date')).toThrow()
  })
})
