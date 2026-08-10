import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserAdministration } from '../useUserAdministration'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const sampleResult = {
  user: {
    id: 1,
    surname: 'MUSTER',
    givenname: 'Max',
    email: 'max@example.com',
    email_verified_at: null,
    auth_locked: false,
    deleted_at: null,
    auth_lastsignal: null,
  },
  newpw: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useUserAdministration', () => {
  it('search requests the search endpoint with the query param', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, label: 'MUSTER, Max' }] })
    const { search } = useUserAdministration()

    const results = await search('muster')

    expect(mockedApi.get).toHaveBeenCalledWith('/administrator/users/search', {
      params: { q: 'muster' },
    })
    expect(results).toEqual([{ id: 1, label: 'MUSTER, Max' }])
  })

  it('listDeleted requests the deleted endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const { listDeleted } = useUserAdministration()

    await listDeleted()

    expect(mockedApi.get).toHaveBeenCalledWith('/administrator/users/deleted')
  })

  it('get requests the user by id', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: sampleResult })
    const { get } = useUserAdministration()

    const result = await get(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/administrator/users/1')
    expect(result).toEqual(sampleResult)
  })

  it('restore POSTs to the restore endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: sampleResult })
    const { restore } = useUserAdministration()

    await restore(1)

    expect(mockedApi.post).toHaveBeenCalledWith('/administrator/users/1/restore')
  })

  it('unlock POSTs to the unlock endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: sampleResult })
    const { unlock } = useUserAdministration()

    await unlock(1)

    expect(mockedApi.post).toHaveBeenCalledWith('/administrator/users/1/unlock')
  })

  it('setPassword POSTs to the set-password endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { ...sampleResult, newpw: 'aB3xY9kLmQ' } })
    const { setPassword } = useUserAdministration()

    const result = await setPassword(1)

    expect(mockedApi.post).toHaveBeenCalledWith('/administrator/users/1/set-password')
    expect(result.newpw).toBe('aB3xY9kLmQ')
  })
})
