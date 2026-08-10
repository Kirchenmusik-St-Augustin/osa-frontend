import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserdirectory } from '../useUserdirectory'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useUserdirectory', () => {
  it('getAbilities requests the abilities endpoint', async () => {
    const abilities = { instruments: [], voices: [], choirjobs: [] }
    mockedApi.get.mockResolvedValueOnce({ data: abilities })
    const { getAbilities } = useUserdirectory()

    const result = await getAbilities()

    expect(mockedApi.get).toHaveBeenCalledWith('/userdirectory/abilities')
    expect(result).toEqual(abilities)
  })

  it('listUsers requests type=all without an id param', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const { listUsers } = useUserdirectory()

    await listUsers('all', null)

    expect(mockedApi.get).toHaveBeenCalledWith('/userdirectory', {
      params: { type: 'all' },
    })
  })

  it('listUsers requests a specific type+id', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const { listUsers } = useUserdirectory()

    await listUsers('choirjobs', 3)

    expect(mockedApi.get).toHaveBeenCalledWith('/userdirectory', {
      params: { type: 'choirjobs', id: 3 },
    })
  })
})
