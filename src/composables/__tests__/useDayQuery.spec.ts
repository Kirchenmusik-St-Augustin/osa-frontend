import type * as VueRouter from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { useDayQuery } from '../useDayQuery'

let mockQuery: Record<string, unknown> = {}
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRoute: () => ({ query: mockQuery }),
}))

describe('useDayQuery', () => {
  it('reads year/month/day from the route query', () => {
    mockQuery = { year: '2026', month: '8', day: '12' }
    const { year, month, day } = useDayQuery()

    expect(year.value).toBe(2026)
    expect(month.value).toBe(8)
    expect(day.value).toBe(12)
  })

  it('defaults to today when the query is empty', () => {
    mockQuery = {}
    const { year, month, day } = useDayQuery()

    const now = new Date()
    expect(year.value).toBe(now.getFullYear())
    expect(month.value).toBe(now.getMonth() + 1)
    expect(day.value).toBe(now.getDate())
  })

  it('defaults to today when the query value is not a valid integer', () => {
    mockQuery = { year: 'not-a-number', month: 'also-not-a-number', day: 'nope' }
    const { year, month, day } = useDayQuery()

    const now = new Date()
    expect(year.value).toBe(now.getFullYear())
    expect(month.value).toBe(now.getMonth() + 1)
    expect(day.value).toBe(now.getDate())
  })

  it('takes the first value when the query param is repeated', () => {
    mockQuery = { year: ['2025', '2020'], month: ['3', '9'], day: ['15', '20'] }
    const { year, month, day } = useDayQuery()

    expect(year.value).toBe(2025)
    expect(month.value).toBe(3)
    expect(day.value).toBe(15)
  })
})
