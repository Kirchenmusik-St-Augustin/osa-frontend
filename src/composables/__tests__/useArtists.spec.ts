import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useArtists } from '../useArtists'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const sampleArtist = {
  id: 1,
  surname: 'MOZART',
  givenname: 'Wolfgang',
  description: null,
  birthyear: 1756,
  deathyear: 1791,
  composer: true,
  conductor: false,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useArtists', () => {
  it('search requests the search endpoint with the query param', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, label: 'MOZART, Wolfgang' }] })
    const { search } = useArtists()

    const results = await search('mozart')

    expect(mockedApi.get).toHaveBeenCalledWith('/artists/search', { params: { q: 'mozart' } })
    expect(results).toEqual([{ id: 1, label: 'MOZART, Wolfgang' }])
  })

  it('listComposers requests the composers endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, label: 'MOZART, Wolfgang' }] })
    const { listComposers } = useArtists()

    const results = await listComposers()

    expect(mockedApi.get).toHaveBeenCalledWith('/artists/composers')
    expect(results).toEqual([{ id: 1, label: 'MOZART, Wolfgang' }])
  })

  it('get requests the artist by id', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: sampleArtist })
    const { get } = useArtists()

    const artist = await get(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/artists/1')
    expect(artist).toEqual(sampleArtist)
  })

  it('create POSTs the payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: sampleArtist })
    const { create } = useArtists()

    const payload = {
      surname: 'Mozart',
      givenname: 'Wolfgang',
      description: null,
      birthyear: null,
      deathyear: null,
      composer: true,
      conductor: false,
    }
    const artist = await create(payload)

    expect(mockedApi.post).toHaveBeenCalledWith('/artists', payload)
    expect(artist).toEqual(sampleArtist)
  })

  it('update PUTs to the id-scoped endpoint', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: sampleArtist })
    const { update } = useArtists()

    const payload = {
      surname: 'Mozart',
      givenname: 'Wolfgang',
      description: 'neu',
      birthyear: null,
      deathyear: null,
      composer: true,
      conductor: false,
    }
    await update(1, payload)

    expect(mockedApi.put).toHaveBeenCalledWith('/artists/1', payload)
  })

  it('remove DELETEs the artist by id', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: null })
    const { remove } = useArtists()

    await remove(1)

    expect(mockedApi.delete).toHaveBeenCalledWith('/artists/1')
  })
})
