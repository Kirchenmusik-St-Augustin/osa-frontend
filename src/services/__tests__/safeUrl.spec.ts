// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { safeHref } from '../safeUrl'

describe('safeHref', () => {
  it.each(['http://example.org', 'https://example.org/a?b=c#d', 'HTTPS://EXAMPLE.ORG'])(
    'keeps the web URL %s unchanged',
    (url) => {
      expect(safeHref(url)).toBe(url)
    },
  )

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)',
    '\tjava\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'mailto:a@example.org',
    'example.org',
    '//example.org/path',
    '/relative/path',
    '',
  ])('rejects %j', (url) => {
    expect(safeHref(url)).toBeUndefined()
  })
})
