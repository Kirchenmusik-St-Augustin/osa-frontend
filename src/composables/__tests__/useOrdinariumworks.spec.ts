import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrdinariumworks } from '../useOrdinariumworks'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const sampleWork = {
  id: 1,
  name: 'Krönungsmesse',
  description: null,
  artist_id: 2,
  artist_name: 'MOZART, Wolfgang',
  duration: 25,
  demanding: false,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useOrdinariumworks', () => {
  it('search requests the search endpoint with the query param', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [{ id: 1, label: 'MOZART, Wolfgang: Krönungsmesse' }],
    })
    const { search } = useOrdinariumworks()

    const results = await search('mozart')

    expect(mockedApi.get).toHaveBeenCalledWith('/ordinariumworks/search', {
      params: { q: 'mozart' },
    })
    expect(results).toEqual([{ id: 1, label: 'MOZART, Wolfgang: Krönungsmesse' }])
  })

  it('get requests the work by id', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: sampleWork })
    const { get } = useOrdinariumworks()

    const work = await get(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/ordinariumworks/1')
    expect(work).toEqual(sampleWork)
  })

  it('getSetup requests the setup sub-resource', async () => {
    const setup = { instruments: [{ id: 1, name: 'Fagott', quantity: 2 }], voices: [] }
    mockedApi.get.mockResolvedValueOnce({ data: setup })
    const { getSetup } = useOrdinariumworks()

    const result = await getSetup(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/ordinariumworks/1/setup')
    expect(result).toEqual(setup)
  })

  it('getAvailablePositions requests the available-positions endpoint', async () => {
    const available = { instruments: [{ id: 1, name: 'Fagott' }], voices: [] }
    mockedApi.get.mockResolvedValueOnce({ data: available })
    const { getAvailablePositions } = useOrdinariumworks()

    const result = await getAvailablePositions()

    expect(mockedApi.get).toHaveBeenCalledWith('/ordinariumworks/available-positions')
    expect(result).toEqual(available)
  })

  it('create POSTs the payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: sampleWork })
    const { create } = useOrdinariumworks()

    const payload = {
      name: 'Krönungsmesse',
      description: null,
      artist_id: 2,
      duration: 25,
      demanding: false,
      setup: { instruments: [], voices: [] },
    }
    await create(payload)

    expect(mockedApi.post).toHaveBeenCalledWith('/ordinariumworks', payload)
  })

  it('update PUTs to the id-scoped endpoint', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: sampleWork })
    const { update } = useOrdinariumworks()

    const payload = {
      name: 'Krönungsmesse',
      description: null,
      artist_id: 2,
      duration: 25,
      demanding: false,
      setup: { instruments: [], voices: [] },
    }
    await update(1, payload)

    expect(mockedApi.put).toHaveBeenCalledWith('/ordinariumworks/1', payload)
  })

  it('remove DELETEs the work by id', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: null })
    const { remove } = useOrdinariumworks()

    await remove(1)

    expect(mockedApi.delete).toHaveBeenCalledWith('/ordinariumworks/1')
  })
})
