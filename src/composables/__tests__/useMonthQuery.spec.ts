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
})
