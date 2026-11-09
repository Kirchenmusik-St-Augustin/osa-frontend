// Reads one integer from a vue-router query value. Vue Router hands over
// `string | null | (string | null)[]`; `Number(raw)` would turn '' / null / ' '
// into 0 and accept '1e3' or '0x10', so only plain digits inside the allowed
// range count, everything else yields the fallback.
export function parseQueryInt(value: unknown, fallback: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || !/^\d{1,4}$/.test(raw)) return fallback
  const parsed = Number(raw)
  return parsed >= min && parsed <= max ? parsed : fallback
}
