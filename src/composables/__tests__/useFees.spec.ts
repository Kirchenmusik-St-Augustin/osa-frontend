// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFees } from '../useFees'
import api from '@/services/api'
import { pageOf, firstPageRequest } from '@/__tests__/pageOf'
import { testId } from '@/__tests__/testId'

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
    mockedApi.get.mockResolvedValueOnce({ data: pageOf(fees) })
    const { items, fetchList } = useFees()

    await fetchList()

    expect(mockedApi.get).toHaveBeenCalledWith('/fees', firstPageRequest())
    expect(items.value).toEqual(fees)
  })

  it('save with null id creates a new fee then refetches', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 1, name: 'Solist', amount: 130 } })
    mockedApi.get.mockResolvedValueOnce({ data: pageOf([]) })
    const { save } = useFees()

    await save(null, { name: 'Solist', amount: 130 })

    expect(mockedApi.post).toHaveBeenCalledWith('/fees', { name: 'Solist', amount: 130 })
    expect(mockedApi.get).toHaveBeenCalledWith('/fees', firstPageRequest())
  })

  it('save with an id updates the existing fee then refetches', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { id: 1, name: 'Solist', amount: 140 } })
    mockedApi.get.mockResolvedValueOnce({ data: pageOf([]) })
    const { save } = useFees()

    await save(testId(1), { name: 'Solist', amount: 140 })

    expect(mockedApi.put).toHaveBeenCalledWith(`/fees/${testId(1)}`, {
      name: 'Solist',
      amount: 140,
    })
    expect(mockedApi.get).toHaveBeenCalledWith('/fees', firstPageRequest())
  })

  it('remove deletes the fee then refetches', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: { status: 'ok' } })
    mockedApi.get.mockResolvedValueOnce({ data: pageOf([]) })
    const { remove } = useFees()

    await remove(testId(1))

    expect(mockedApi.delete).toHaveBeenCalledWith(`/fees/${testId(1)}`)
    expect(mockedApi.get).toHaveBeenCalledWith('/fees', firstPageRequest())
  })
})
