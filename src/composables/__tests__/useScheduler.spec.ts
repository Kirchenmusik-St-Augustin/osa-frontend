import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScheduler } from '../useScheduler'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useScheduler', () => {
  it('listScheduledJobs requests the scheduler jobs endpoint', async () => {
    const jobs = [
      {
        id: 'purge_stale_booking_requests',
        name: 'purge_stale_booking_requests',
        trigger: 'interval[1:00:00]',
        next_run: '13.08.2026, 15:00',
        description: 'Löscht stündlich offene Buchungsanfragen.',
      },
    ]
    mockedApi.get.mockResolvedValueOnce({ data: jobs })
    const { listScheduledJobs } = useScheduler()

    const result = await listScheduledJobs()

    expect(mockedApi.get).toHaveBeenCalledWith('/administrator/scheduler/jobs')
    expect(result).toEqual(jobs)
  })
})
