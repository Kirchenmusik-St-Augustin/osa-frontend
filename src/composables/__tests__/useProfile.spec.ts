import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProfile } from '../useProfile'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const sampleUser = {
  id: 1,
  surname: 'SCHINDLER',
  givenname: 'Margot',
  email: 'margot@example.com',
  email_verified_at: null,
  phone: '0664 9182108',
  auth_lastsignal: null,
  auth_locked: false,
  administrator: false,
  deletable: true,
  oauth2_bindings: [],
  instruments: [],
  voices: [],
  choirjobs: [],
  roles: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useProfile', () => {
  it('get requests the profile endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: sampleUser })
    const { get } = useProfile()

    const user = await get()

    expect(mockedApi.get).toHaveBeenCalledWith('/profile')
    expect(user).toEqual(sampleUser)
  })

  it('update PUTs the payload to the profile endpoint', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: sampleUser })
    const { update } = useProfile()

    const payload = {
      givenname: 'Margot',
      surname: 'Schindler',
      email: 'margot@example.com',
      phone: '0664 9182108',
      change_password: false,
      password: null,
      password_confirmation: null,
      auth_password: 'current-password',
    }
    await update(payload)

    expect(mockedApi.put).toHaveBeenCalledWith('/profile', payload)
  })

  it('disconnectOauth2 DELETEs the existing auth endpoint', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: null })
    const { disconnectOauth2 } = useProfile()

    await disconnectOauth2(7)

    expect(mockedApi.delete).toHaveBeenCalledWith('/auth/oauth2/7')
  })
})
