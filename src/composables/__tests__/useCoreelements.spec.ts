import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useCoreelements } from '../useCoreelements'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const sampleItem = {
  id: 1,
  name: 'Fagott',
  order: 1,
  label: null,
  description: null,
  address: null,
  color: null,
  active: true,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCoreelements', () => {
  it('fetchList requests the type-scoped list endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [sampleItem] })
    const { items, fetchList } = useCoreelements('instrument')

    await fetchList()

    expect(mockedApi.get).toHaveBeenCalledWith('/coreelements/instrument')
    expect(items.value).toEqual([sampleItem])
  })

  it('save without an id POSTs and refreshes the list', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: sampleItem })
    mockedApi.get.mockResolvedValueOnce({ data: [sampleItem] })
    const { items, save } = useCoreelements('instrument')

    await save(null, { name: 'Fagott' })

    expect(mockedApi.post).toHaveBeenCalledWith('/coreelements/instrument', { name: 'Fagott' })
    expect(items.value).toEqual([sampleItem])
  })

  it('save with an id PUTs to that id and refreshes the list', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: sampleItem })
    mockedApi.get.mockResolvedValueOnce({ data: [sampleItem] })
    const { save } = useCoreelements('location')

    await save(5, { name: 'Chorraum', address: 'Hauptstraße 1', color: 'ff0000' })

    expect(mockedApi.put).toHaveBeenCalledWith('/coreelements/location/5', {
      name: 'Chorraum',
      address: 'Hauptstraße 1',
      color: 'ff0000',
    })
  })

  it('save passes the active field through in the payload', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { ...sampleItem, active: false } })
    mockedApi.get.mockResolvedValueOnce({ data: [{ ...sampleItem, active: false }] })
    const { items, save } = useCoreelements('instrument')

    await save(1, { name: 'Fagott', active: false })

    expect(mockedApi.put).toHaveBeenCalledWith('/coreelements/instrument/1', {
      name: 'Fagott',
      active: false,
    })
    expect(items.value[0]?.active).toBe(false)
  })

  it('remove DELETEs the item and refreshes the list', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: null })
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const { items, remove } = useCoreelements('instrument')

    await remove(1)

    expect(mockedApi.delete).toHaveBeenCalledWith('/coreelements/instrument/1')
    expect(items.value).toEqual([])
  })

  it('move POSTs to the move endpoint and updates items from the response', async () => {
    const reordered = [{ ...sampleItem, id: 2 }, sampleItem]
    mockedApi.post.mockResolvedValueOnce({ data: reordered })
    const { items, move } = useCoreelements('instrument')

    await move(1, 'up')

    expect(mockedApi.post).toHaveBeenCalledWith('/coreelements/instrument/1/move/up')
    expect(items.value).toEqual(reordered)
  })

  it('propagates errors from save so the caller can show field errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('validation failed'))
    const { save } = useCoreelements('instrument')

    await expect(save(null, { name: 'ab' })).rejects.toThrow('validation failed')
  })

  it('re-reads a reactive type on every call instead of caching it at setup', async () => {
    // Regression test: Vue Router reuses the same CoreelementView instance
    // (and therefore the same useCoreelements() call) when navigating
    // between two administrator-coreelement routes -- a plain string
    // captured once would silently keep requesting the FIRST type forever.
    const type = ref<'instrument' | 'voice'>('instrument')
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const { fetchList } = useCoreelements(type)
    await fetchList()
    expect(mockedApi.get).toHaveBeenLastCalledWith('/coreelements/instrument')

    type.value = 'voice'
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    await fetchList()

    expect(mockedApi.get).toHaveBeenLastCalledWith('/coreelements/voice')
  })
})
