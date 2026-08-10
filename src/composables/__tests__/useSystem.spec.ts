import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSystem } from '../useSystem'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSystem', () => {
  it('getEnvironment requests the system environment endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { environment: 'production' } })
    const { getEnvironment } = useSystem()

    const result = await getEnvironment()

    expect(mockedApi.get).toHaveBeenCalledWith('/system/environment')
    expect(result).toEqual({ environment: 'production' })
  })
})
