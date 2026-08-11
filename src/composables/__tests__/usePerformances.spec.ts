import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePerformances, type PerformancePayload } from '../usePerformances'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

const samplePayload: PerformancePayload = {
  schedule: '2026-08-02T11:00:00',
  location_id: 1,
  ordinariumwork_id: 2,
  artist_id: null,
  description: null,
  choirjob_defaultfee: 35,
  instrument_defaultfee: 60,
  voice_defaultfee: 110,
  extracost_amount: null,
  extracost_description: null,
  setup: { instruments: [], voices: [], choirjobs: [] },
  proprium: [],
  rehearsals: [],
}

describe('usePerformances', () => {
  it('listForMonth requests the calendar endpoint with year/month params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const { listForMonth } = usePerformances()

    const result = await listForMonth(2026, 8)

    expect(mockedApi.get).toHaveBeenCalledWith('/performances', {
      params: { year: 2026, month: 8 },
    })
    expect(result).toEqual([])
  })

  it('getAvailableData requests the available sub-resource', async () => {
    const available = {
      conductors: [],
      instruments: [],
      voices: [],
      choirjobs: [],
      locations: [],
      propriumelements: [],
    }
    mockedApi.get.mockResolvedValueOnce({ data: available })
    const { getAvailableData } = usePerformances()

    const result = await getAvailableData()

    expect(mockedApi.get).toHaveBeenCalledWith('/performances/available')
    expect(result).toEqual(available)
  })

  it('getDetail requests the performance by id', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { id: 1 } })
    const { getDetail } = usePerformances()

    await getDetail(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/performances/1')
  })

  it('getFormData requests the form sub-resource', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { id: 1 } })
    const { getFormData } = usePerformances()

    await getFormData(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/performances/1/form')
  })

  it('create POSTs the payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 1 } })
    const { create } = usePerformances()

    await create(samplePayload)

    expect(mockedApi.post).toHaveBeenCalledWith('/performances', samplePayload)
  })

  it('update PUTs to the id-scoped endpoint', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { id: 1 } })
    const { update } = usePerformances()

    await update(1, samplePayload)

    expect(mockedApi.put).toHaveBeenCalledWith('/performances/1', samplePayload)
  })

  it('remove DELETEs the performance by id', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: null })
    const { remove } = usePerformances()

    await remove(1)

    expect(mockedApi.delete).toHaveBeenCalledWith('/performances/1')
  })
})
