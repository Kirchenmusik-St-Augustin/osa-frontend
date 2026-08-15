// Small, dependency-free German date-formatting helper -- Legacy formats
// dates via moment.js's German locale; this project has no date library, and
// pulling in moment/dayjs just for text formatting (as opposed to the
// Flatpickr *widget*, which was a deliberate pixel-parity exception) would
// be exactly the kind of unnecessary dependency CLAUDE.md's "schlank"
// pillar warns against. These arrays mirror moment's de.js locale tokens
// (`monthsShort`/`months`/`weekdaysMin`) so the rendered text matches
// Legacy byte for byte.
const MONTHS_SHORT = [
  'Jan.',
  'Feb.',
  'März',
  'Apr.',
  'Mai',
  'Juni',
  'Juli',
  'Aug.',
  'Sep.',
  'Okt.',
  'Nov.',
  'Dez.',
]
const MONTHS_FULL = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

// The backend serializes `schedule` fields as a naive, offset-free string
// representing local wall-clock time in Settings.app_timezone (default
// Europe/Vienna) -- SQLite has no real timezone storage, and unlike
// created_at/updated_at (genuinely UTC audit columns), `schedule` is a
// user-entered value that mirrors Legacy's Carbon under
// config('app.timezone') (see osa-backend's app/core/datetime_utils.py::
// local_now()). It carries NO timezone of its own and must never be run
// through real UTC conversion: `new Date(iso)` treats an offset-free ISO
// string as UTC and converts it to the viewer's browser-local time on
// read, and `date.toISOString()` does the same in reverse on write --
// both silently shift the value by the viewer's UTC offset (this broke
// the July 2026 calendar by +2h under CEST before this fix). Instead we
// read/write the wall-clock digits directly, matching how Legacy's own
// moment.js formatting behaves on a naive value.
const WALL_CLOCK_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/

export function parseWallClock(value: string): Date {
  const match = WALL_CLOCK_PATTERN.exec(value)
  if (!match) throw new Error(`Unparseable schedule value: ${value}`)
  const [, year, month, day, hour, minute, second] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ]
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )
}

// The inverse of parseWallClock: turns a local Date (e.g. from a Flatpickr
// selection, which already operates in wall-clock time) back into the
// naive wall-clock string the backend expects on write.
export function toWallClockString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatReadable(date: Date): string {
  return `${date.getDate()}. ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Mirrors Legacy's helper.js `datetimeReadable()` ("D. MMM YYYY, HH:mm"),
// e.g. "2. Aug 2026, 11:00".
export function formatDateTime(iso: string): string {
  return formatReadable(parseWallClock(iso))
}

// Same "D. MMM YYYY, HH:mm" rendering as formatDateTime, but for genuinely
// UTC-instant timestamps (created_at/updated_at/email_verified_at/
// auth_lastsignal, all written via Python's datetime.now(UTC), unlike
// Performance.schedule) -- these carry a real offset ("+00:00"/"Z"), so
// they go through a normal Date() parse + the browser's local-timezone
// getters instead of parseWallClock's raw-digit read. Assumes the viewer
// is in the app's own timezone (Europe/Vienna) for the rendered wall-clock
// numbers to be meaningful, same assumption Legacy's server-rendered pages
// make implicitly.
export function formatUtcDateTime(iso: string): string {
  return formatReadable(new Date(iso))
}

// Mirrors the DatetimePickerComponent's read-only past-date fallback
// ("dd, D. MMMM Y, HH:mm"), e.g. "So, 2. August 2026, 11:00".
export function formatDateTimeWithWeekday(iso: string): string {
  const date = parseWallClock(iso)
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()}. ${MONTHS_FULL[date.getMonth()]} ${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Mirrors MonthNavigatorComponent's "MMMM YYYY" title, e.g. "Juli 2026".
export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS_FULL[month - 1]} ${year}`
}

// Extracts {year, month, day} from a genuinely UTC-instant timestamp
// (created_at et al.) using the same browser-local-getter approach as
// formatUtcDateTime/formatDateOnly above -- for call sites that need the
// individual calendar parts (e.g. a "back to this record's own
// month/day" navigation target) rather than a rendered string. Counterpart
// to parseCalendarDate() below, which is for date-only (no time component)
// strings instead.
export function parseUtcInstantDate(iso: string): { year: number; month: number; day: number } {
  const date = new Date(iso)
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
}

// Mirrors moment.js's localized "LL" format ("D. MMMM YYYY", e.g.
// "12. Juni 2026") used by Legacy's RequestLogs/IndexUser.vue to group log
// entries by day. UTC-instant input, same browser-local-getter approach as
// formatUtcDateTime -- no time component.
export function formatDateOnly(iso: string): string {
  const { year, month, day } = parseUtcInstantDate(iso)
  return `${day}. ${MONTHS_FULL[month - 1]} ${year}`
}

// Day-granularity sibling of formatMonthYear() above -- same "D. MMMM
// YYYY" rendering as formatDateOnly(), built from year/month/day integers
// directly instead of parsed from an ISO instant. Backs the day-group
// headings in RequestLogIndexView.vue's CollapsibleSection titles.
export function formatDayMonthYear(year: number, month: number, day: number): string {
  return `${day}. ${MONTHS_FULL[month - 1]} ${year}`
}

// Parses a Pydantic `date`-serialized "YYYY-MM-DD" string into its numeric
// parts WITHOUT constructing a Date -- `new Date("YYYY-MM-DD")` parses as
// UTC midnight, and re-reading it via local Date getters can shift the
// displayed day by one under a negative UTC offset. Same risk class
// parseWallClock() above already guards against for naive wall-clock time
// strings; a date-only string carries no time-of-day to anchor a
// Date-based parse against, so it needs the identical string-split
// treatment.
export function parseCalendarDate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    throw new Error(`Unparseable calendar date: ${iso}`)
  }
  return { year, month, day }
}

// Mirrors moment.js's "HH:mm:ss" format used per-row in Legacy's
// RequestLogs/IndexUser.vue table. UTC-instant input.
export function formatTimeOnly(iso: string): string {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
