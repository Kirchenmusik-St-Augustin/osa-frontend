import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePropriumworks } from '../usePropriumworks'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const sampleWork = {
  id: 1,
  name: 'Introitus',
  description: null,
  artist_id: 2,
  artist_name: 'HAYDN, Joseph',
  duration: 5,
  demanding: false,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usePropriumworks', () => {
  it('search requests the search endpoint with the query param', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, label: 'HAYDN, Joseph: Introitus' }] })
    const { search } = usePropriumworks()

    const results = await search('haydn')

    expect(mockedApi.get).toHaveBeenCalledWith('/propriumworks/search', {
      params: { q: 'haydn' },
    })
    expect(results).toEqual([{ id: 1, label: 'HAYDN, Joseph: Introitus' }])
  })

  it('get requests the work by id', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: sampleWork })
    const { get } = usePropriumworks()

    const work = await get(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/propriumworks/1')
    expect(work).toEqual(sampleWork)
  })

  it('create POSTs the payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: sampleWork })
    const { create } = usePropriumworks()

    const payload = {
      name: 'Introitus',
      description: null,
      artist_id: 2,
      duration: 5,
      demanding: false,
    }
    await create(payload)

    expect(mockedApi.post).toHaveBeenCalledWith('/propriumworks', payload)
  })

  it('update PUTs to the id-scoped endpoint', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: sampleWork })
    const { update } = usePropriumworks()

    const payload = {
      name: 'Introitus',
      description: null,
      artist_id: 2,
      duration: 5,
      demanding: false,
    }
    await update(1, payload)

    expect(mockedApi.put).toHaveBeenCalledWith('/propriumworks/1', payload)
  })

  it('remove DELETEs the work by id', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: null })
    const { remove } = usePropriumworks()

    await remove(1)

    expect(mockedApi.delete).toHaveBeenCalledWith('/propriumworks/1')
  })
})
