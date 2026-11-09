// @vitest-environment node
import type * as VueRouter from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { useMonthQuery } from '../useMonthQuery'

let mockQuery: Record<string, unknown> = {}
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRoute: () => ({ query: mockQuery }),
}))

describe('useMonthQuery', () => {
  it('reads year/month from the route query', () => {
    mockQuery = { year: '2026', month: '8' }
    const { year, month } = useMonthQuery()

    expect(year.value).toBe(2026)
    expect(month.value).toBe(8)
  })

  it('defaults to the current month when the query is empty', () => {
    mockQuery = {}
    const { year, month } = useMonthQuery()

    const now = new Date()
    expect(year.value).toBe(now.getFullYear())
    expect(month.value).toBe(now.getMonth() + 1)
  })

  it('defaults to the current month when the query value is not a valid integer', () => {
    mockQuery = { year: 'not-a-number', month: 'also-not-a-number' }
    const { year, month } = useMonthQuery()

    const now = new Date()
    expect(year.value).toBe(now.getFullYear())
    expect(month.value).toBe(now.getMonth() + 1)
  })

  it('takes the first value when the query param is repeated', () => {
    mockQuery = { year: ['2025', '2020'], month: ['3', '9'] }
    const { year, month } = useMonthQuery()

    expect(year.value).toBe(2025)
    expect(month.value).toBe(3)
  })

  it.each([[''], [null], [' '], ['0'], ['13'], ['-1'], ['1e3'], ['0x10'], ['2.5'], ['99999']])(
    'falls back to the current month for the unusable value %j',
    (value) => {
      mockQuery = { year: value, month: value }
      const { year, month } = useMonthQuery()

      const now = new Date()
      expect(year.value).toBe(now.getFullYear())
      expect(month.value).toBe(now.getMonth() + 1)
    },
  )

  it('accepts the boundaries of the valid month range', () => {
    mockQuery = { year: '2026', month: '12' }
    expect(useMonthQuery().month.value).toBe(12)

    mockQuery = { year: '2026', month: '1' }
    expect(useMonthQuery().month.value).toBe(1)
  })
})
