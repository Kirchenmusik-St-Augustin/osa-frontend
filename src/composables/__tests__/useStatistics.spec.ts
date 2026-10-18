import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStatistics } from '../useStatistics'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useStatistics', () => {
  it('get requests the statistics endpoint', async () => {
    const stats = {
      users: 419,
      performances: 120,
      ordinariumworks: 45,
      propriumworks: 30,
      scores: 612,
      email: { active: false, period_days: 30, threshold: 950, sent: 214 },
    }
    mockedApi.get.mockResolvedValueOnce({ data: stats })
    const { get } = useStatistics()

    const result = await get()

    expect(mockedApi.get).toHaveBeenCalledWith('/statistics')
    expect(result).toEqual(stats)
  })

  it('passes a withheld mail volume (email: null) through unchanged', async () => {
    const stats = {
      users: 1,
      performances: 2,
      ordinariumworks: 3,
      propriumworks: 4,
      scores: 5,
      email: null,
    }
    mockedApi.get.mockResolvedValueOnce({ data: stats })
    const { get } = useStatistics()

    const result = await get()

    expect(result.email).toBeNull()
  })
})
