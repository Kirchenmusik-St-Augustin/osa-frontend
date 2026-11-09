// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseQueryInt } from '../routeQuery'

describe('parseQueryInt', () => {
  it('returns a plain in-range integer', () => {
    expect(parseQueryInt('8', 1, 1, 12)).toBe(8)
  })

  it('takes the first entry of a repeated parameter', () => {
    expect(parseQueryInt(['3', '9'], 1, 1, 12)).toBe(3)
  })

  it('accepts both ends of the range', () => {
    expect(parseQueryInt('1', 5, 1, 12)).toBe(1)
    expect(parseQueryInt('12', 5, 1, 12)).toBe(12)
  })

  it.each([
    [undefined],
    [null],
    [''],
    [' '],
    ['0'],
    ['13'],
    ['-1'],
    ['1e3'],
    ['0x10'],
    ['2.5'],
    [8],
  ])('returns the fallback for %j', (value) => {
    expect(parseQueryInt(value, 5, 1, 12)).toBe(5)
  })
})
