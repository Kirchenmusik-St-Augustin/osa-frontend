import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLoadingStore } from '../loading'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('loading store', () => {
  it('starts with no active requests and isLoading false', () => {
    const store = useLoadingStore()

    expect(store.activeRequests).toBe(0)
    expect(store.isLoading).toBe(false)
  })

  it('sets isLoading true after a single startLoading call', () => {
    const store = useLoadingStore()

    store.startLoading()

    expect(store.activeRequests).toBe(1)
    expect(store.isLoading).toBe(true)
  })

  it('sets isLoading false again after the matching stopLoading call', () => {
    const store = useLoadingStore()

    store.startLoading()
    store.stopLoading()

    expect(store.activeRequests).toBe(0)
    expect(store.isLoading).toBe(false)
  })

  it('keeps isLoading true while any overlapping request is still active', () => {
    const store = useLoadingStore()

    store.startLoading()
    store.startLoading()
    store.startLoading()
    store.stopLoading()

    expect(store.activeRequests).toBe(2)
    expect(store.isLoading).toBe(true)

    store.stopLoading()
    expect(store.isLoading).toBe(true)

    store.stopLoading()
    expect(store.activeRequests).toBe(0)
    expect(store.isLoading).toBe(false)
  })

  it('never goes below zero when stopLoading is called without a matching start', () => {
    const store = useLoadingStore()

    store.stopLoading()
    store.stopLoading()

    expect(store.activeRequests).toBe(0)
    expect(store.isLoading).toBe(false)
  })
})
