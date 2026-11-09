// A link target that comes from stored data (Kurz-URL targets) may only open
// as a web page. Vue binds `:href` as given, so a stored `javascript:` or
// `data:` URL would run script in the application's own origin when clicked
// (a new tab opened from a `javascript:` link inherits that origin). The
// scheme is read from the PARSED URL, which also catches variants such as
// leading blanks or tabs and newlines inside the scheme.
const WEB_PROTOCOLS = new Set(['http:', 'https:'])

export function safeHref(value: string): string | undefined {
  try {
    return WEB_PROTOCOLS.has(new URL(value).protocol) ? value : undefined
  } catch {
    return undefined
  }
}
