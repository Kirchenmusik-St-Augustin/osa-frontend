import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUsers } from '../useUsers'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const sampleUser = {
  id: 1,
  surname: 'SCHINDLER',
  givenname: 'Margot',
  email: 'margot@example.com',
  email_verified_at: '2023-12-28T16:50:00+00:00',
  phone: '0664 9182108',
  auth_lastsignal: '2026-02-11T13:54:00+00:00',
  auth_locked: false,
  administrator: false,
  deletable: true,
  oauth2_bindings: [],
  instruments: [],
  voices: [],
  choirjobs: [{ id: 3, name: 'Substitut' }],
  roles: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useUsers', () => {
  it('search requests the search endpoint with the query param', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, label: 'SCHINDLER, Margot' }] })
    const { search } = useUsers()

    const results = await search('schindler')

    expect(mockedApi.get).toHaveBeenCalledWith('/users/search', {
      params: { q: 'schindler' },
    })
    expect(results).toEqual([{ id: 1, label: 'SCHINDLER, Margot' }])
  })

  it('getFormOptions requests the catalog endpoint', async () => {
    const catalog = { instruments: [], voices: [], choirjobs: [], roles: [] }
    mockedApi.get.mockResolvedValueOnce({ data: catalog })
    const { getFormOptions } = useUsers()

    const options = await getFormOptions()

    expect(mockedApi.get).toHaveBeenCalledWith('/users/form-options')
    expect(options).toEqual(catalog)
  })

  it('get requests the user by id', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: sampleUser })
    const { get } = useUsers()

    const user = await get(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/users/1')
    expect(user).toEqual(sampleUser)
  })

  it('create POSTs the payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: sampleUser })
    const { create } = useUsers()

    const payload = {
      givenname: 'Margot',
      surname: 'Schindler',
      email: null,
      phone: null,
      auth_locked: false,
      instruments: [],
      voices: [],
      choirjobs: [3],
      roles: [],
    }
    const user = await create(payload)

    expect(mockedApi.post).toHaveBeenCalledWith('/users', payload)
    expect(user).toEqual(sampleUser)
  })

  it('update PUTs to the id-scoped endpoint', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: sampleUser })
    const { update } = useUsers()

    const payload = {
      givenname: 'Margot',
      surname: 'Schindler',
      email: null,
      phone: null,
      auth_locked: true,
      instruments: [],
      voices: [],
      choirjobs: [],
      roles: [],
    }
    await update(1, payload)

    expect(mockedApi.put).toHaveBeenCalledWith('/users/1', payload)
  })

  it('remove DELETEs the user by id', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: null })
    const { remove } = useUsers()

    await remove(1)

    expect(mockedApi.delete).toHaveBeenCalledWith('/users/1')
  })

  it('getRequestsAndBookings requests the id-scoped endpoint', async () => {
    const entries = [
      {
        id: 5,
        ordinariumwork_name: 'Krönungsmesse',
        ordinariumwork_artist_name: 'MOZART, Wolfgang',
        artist_name: null,
        schedule: '2099-01-01T12:00:00',
        location: { id: 1, name: 'Augustinerkirche', color: '336699', address: null },
        user_booking: { status: 4, position: null, at: null },
        proprium: [],
        demanding_proprium: false,
        rehearsals: [],
      },
    ]
    mockedApi.get.mockResolvedValueOnce({ data: entries })
    const { getRequestsAndBookings } = useUsers()

    const result = await getRequestsAndBookings(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/users/1/requests-and-bookings')
    expect(result).toEqual(entries)
  })
})
