import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScheduler } from '../useScheduler'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
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

  it('triggerBackup posts to the backup trigger endpoint', async () => {
    const trigger = {
      backup_name: 'production-2026-08-13_12-00-00-manual.tar.gz',
      triggered_at: '2026-08-13T12:00:00+00:00',
    }
    mockedApi.post.mockResolvedValueOnce({ data: trigger })
    const { triggerBackup } = useScheduler()

    const result = await triggerBackup()

    expect(mockedApi.post).toHaveBeenCalledWith('/administrator/scheduler/backup/trigger')
    expect(result).toEqual(trigger)
  })

  it('triggerDownsync posts to the downsync trigger endpoint', async () => {
    const trigger = {
      restored_backup: 'production-2026-08-21_04-00-00.tar.gz',
      triggered_at: '2026-08-21T04:00:00+00:00',
    }
    mockedApi.post.mockResolvedValueOnce({ data: trigger })
    const { triggerDownsync } = useScheduler()

    const result = await triggerDownsync()

    expect(mockedApi.post).toHaveBeenCalledWith('/administrator/scheduler/downsync/trigger')
    expect(result).toEqual(trigger)
  })
})
