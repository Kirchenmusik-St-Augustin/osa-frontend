import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useShorturls } from '../useShorturls'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useShorturls', () => {
  it('fetchList populates items and urlprefix from the shorturls endpoint', async () => {
    const body = {
      urlprefix: 'https://go.hochamt.at.dev.schimpl.cc/',
      items: [
        {
          id: 1,
          path: 'konzert',
          target: 'http://example.org',
          counter: 3,
          latestcall_at: '2026-08-01T10:00:00+00:00',
        },
      ],
    }
    mockedApi.get.mockResolvedValueOnce({ data: body })
    const { items, urlprefix, fetchList } = useShorturls()

    await fetchList()

    expect(mockedApi.get).toHaveBeenCalledWith('/shorturls')
    expect(urlprefix.value).toBe(body.urlprefix)
    expect(items.value).toEqual(body.items)
  })

  it('save with null id creates a new shorturl then refetches', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { id: 1, path: 'foo', target: 'http://example.org', counter: 0, latestcall_at: null },
    })
    mockedApi.get.mockResolvedValueOnce({
      data: { urlprefix: 'https://go.hochamt.at/', items: [] },
    })
    const { save } = useShorturls()

    await save(null, { path: 'foo', target: 'example.org' })

    expect(mockedApi.post).toHaveBeenCalledWith('/shorturls', {
      path: 'foo',
      target: 'example.org',
    })
    expect(mockedApi.get).toHaveBeenCalledWith('/shorturls')
  })

  it('save with an id updates the existing shorturl then refetches', async () => {
    mockedApi.put.mockResolvedValueOnce({
      data: { id: 1, path: 'bar', target: 'http://example.org', counter: 0, latestcall_at: null },
    })
    mockedApi.get.mockResolvedValueOnce({
      data: { urlprefix: 'https://go.hochamt.at/', items: [] },
    })
    const { save } = useShorturls()

    await save(1, { path: 'bar', target: 'example.org' })

    expect(mockedApi.put).toHaveBeenCalledWith('/shorturls/1', {
      path: 'bar',
      target: 'example.org',
    })
    expect(mockedApi.get).toHaveBeenCalledWith('/shorturls')
  })

  it('remove deletes the shorturl then refetches', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: { status: 'ok' } })
    mockedApi.get.mockResolvedValueOnce({
      data: { urlprefix: 'https://go.hochamt.at/', items: [] },
    })
    const { remove } = useShorturls()

    await remove(1)

    expect(mockedApi.delete).toHaveBeenCalledWith('/shorturls/1')
    expect(mockedApi.get).toHaveBeenCalledWith('/shorturls')
  })
})
