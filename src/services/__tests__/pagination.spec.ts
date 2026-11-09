// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAllPages, PAGE_SIZE } from '../pagination'
import api from '@/services/api'
import { pageOf } from '@/__tests__/pageOf'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const rows = (count: number, from = 0): number[] =>
  Array.from({ length: count }, (_, i) => from + i)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('fetchAllPages', () => {
  it('requests the first page with the largest page size and returns its rows', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: pageOf([1, 2, 3]) })

    const result = await fetchAllPages<number>('/things')

    expect(result).toEqual([1, 2, 3])
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
    expect(mockedApi.get).toHaveBeenCalledWith('/things', {
      params: { limit: PAGE_SIZE, offset: 0 },
    })
  })

  it('reads page after page until the total has arrived', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: pageOf(rows(500), 1200) })
      .mockResolvedValueOnce({ data: pageOf(rows(500, 500), 1200) })
      .mockResolvedValueOnce({ data: pageOf(rows(200, 1000), 1200) })

    const result = await fetchAllPages<number>('/things')

    expect(result).toEqual(rows(1200))
    expect(mockedApi.get.mock.calls.map(([, config]) => config?.params)).toEqual([
      { limit: PAGE_SIZE, offset: 0 },
      { limit: PAGE_SIZE, offset: 500 },
      { limit: PAGE_SIZE, offset: 1000 },
    ])
  })

  it('sends the endpoint parameters with every page', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: pageOf(rows(500), 501) })
      .mockResolvedValueOnce({ data: pageOf([500], 501) })

    await fetchAllPages<number>('/things', { year: 2026, month: 8 })

    expect(mockedApi.get.mock.calls.map(([, config]) => config?.params)).toEqual([
      { year: 2026, month: 8, limit: PAGE_SIZE, offset: 0 },
      { year: 2026, month: 8, limit: PAGE_SIZE, offset: 500 },
    ])
  })

  it('makes a single request for an empty result', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: pageOf<number>([]) })

    expect(await fetchAllPages<number>('/things')).toEqual([])
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  it('stops at an empty page even when the total promises more rows', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: pageOf(rows(500), 900) })
      .mockResolvedValueOnce({ data: pageOf<number>([], 900) })

    const result = await fetchAllPages<number>('/things')

    expect(result).toEqual(rows(500))
    expect(mockedApi.get).toHaveBeenCalledTimes(2)
  })

  it('passes a failing request on to the caller', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: pageOf(rows(500), 900) })
      .mockRejectedValueOnce(new Error('network down'))

    await expect(fetchAllPages<number>('/things')).rejects.toThrow('network down')
  })
})
