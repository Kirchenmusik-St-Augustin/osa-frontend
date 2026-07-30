import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFees } from '../useFees'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useFees', () => {
  it('fetchList populates items from the fees endpoint', async () => {
    const fees = [{ id: 1, name: 'Instrumentalist', amount: 80 }]
    mockedApi.get.mockResolvedValueOnce({ data: fees })
    const { items, fetchList } = useFees()

    await fetchList()

    expect(mockedApi.get).toHaveBeenCalledWith('/fees')
    expect(items.value).toEqual(fees)
  })

  it('save with null id creates a new fee then refetches', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 1, name: 'Solist', amount: 130 } })
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const { save } = useFees()

    await save(null, { name: 'Solist', amount: 130 })

    expect(mockedApi.post).toHaveBeenCalledWith('/fees', { name: 'Solist', amount: 130 })
    expect(mockedApi.get).toHaveBeenCalledWith('/fees')
  })

  it('save with an id updates the existing fee then refetches', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { id: 1, name: 'Solist', amount: 140 } })
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const { save } = useFees()

    await save(1, { name: 'Solist', amount: 140 })

    expect(mockedApi.put).toHaveBeenCalledWith('/fees/1', { name: 'Solist', amount: 140 })
    expect(mockedApi.get).toHaveBeenCalledWith('/fees')
  })

  it('remove deletes the fee then refetches', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: { status: 'ok' } })
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const { remove } = useFees()

    await remove(1)

    expect(mockedApi.delete).toHaveBeenCalledWith('/fees/1')
    expect(mockedApi.get).toHaveBeenCalledWith('/fees')
  })
})
