import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScores } from '../useScores'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useScores', () => {
  it('getFieldsConfig requests the fields-config endpoint', async () => {
    const config = {
      werk: { label: 'Werk', kind: 'text', length: 75, required: true, values: null },
    }
    mockedApi.get.mockResolvedValueOnce({ data: config })
    const { getFieldsConfig } = useScores()

    const result = await getFieldsConfig()

    expect(mockedApi.get).toHaveBeenCalledWith('/scores/fields-config')
    expect(result).toEqual(config)
  })

  it('getDefaults requests the defaults endpoint', async () => {
    const defaults = { werk: '', violine1: 0 }
    mockedApi.get.mockResolvedValueOnce({ data: defaults })
    const { getDefaults } = useScores()

    const result = await getDefaults()

    expect(mockedApi.get).toHaveBeenCalledWith('/scores/defaults')
    expect(result).toEqual(defaults)
  })

  it('search requests the search endpoint with the query param', async () => {
    const results = [{ id: 1, label: 'MOZART, Wolfgang: Requiem' }]
    mockedApi.get.mockResolvedValueOnce({ data: results })
    const { search } = useScores()

    const result = await search('Mozart')

    expect(mockedApi.get).toHaveBeenCalledWith('/scores/search', { params: { q: 'Mozart' } })
    expect(result).toEqual(results)
  })

  it('get requests a single score by id', async () => {
    const score = { id: 7, created_at: null, updated_at: null, fields: { werk: 'Requiem' } }
    mockedApi.get.mockResolvedValueOnce({ data: score })
    const { get } = useScores()

    const result = await get(7)

    expect(mockedApi.get).toHaveBeenCalledWith('/scores/7')
    expect(result).toEqual(score)
  })

  it('create posts the payload to /scores', async () => {
    const payload = { werk: 'Requiem' }
    const created = { id: 1, created_at: '2026-01-01T00:00:00Z', updated_at: null, fields: payload }
    mockedApi.post.mockResolvedValueOnce({ data: created })
    const { create } = useScores()

    const result = await create(payload)

    expect(mockedApi.post).toHaveBeenCalledWith('/scores', payload)
    expect(result).toEqual(created)
  })

  it('update puts the payload to /scores/:id', async () => {
    const payload = { werk: 'Requiem (rev.)' }
    const updated = { id: 1, created_at: null, updated_at: '2026-01-02T00:00:00Z', fields: payload }
    mockedApi.put.mockResolvedValueOnce({ data: updated })
    const { update } = useScores()

    const result = await update(1, payload)

    expect(mockedApi.put).toHaveBeenCalledWith('/scores/1', payload)
    expect(result).toEqual(updated)
  })
})
