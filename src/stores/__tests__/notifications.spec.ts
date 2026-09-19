import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { TOAST_DURATION_MS, useNotificationStore } from '../notifications'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('notifications store -- toasts', () => {
  it('starts without toasts', () => {
    expect(useNotificationStore().toasts).toEqual([])
  })

  it('adds a success toast by default and an error toast on request', () => {
    const store = useNotificationStore()

    store.showToast('gespeichert')
    store.showToast('kaputt', true)

    expect(store.toasts).toEqual([
      { id: expect.any(Number), message: 'gespeichert', isError: false },
      { id: expect.any(Number), message: 'kaputt', isError: true },
    ])
    expect(store.toasts[0]?.id).not.toBe(store.toasts[1]?.id)
  })

  it('dismisses a toast by itself once the display time has passed', () => {
    const store = useNotificationStore()
    store.showToast('gespeichert')

    vi.advanceTimersByTime(TOAST_DURATION_MS - 1)
    expect(store.toasts).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(store.toasts).toHaveLength(0)
  })

  it('times every toast independently', () => {
    const store = useNotificationStore()
    store.showToast('erste')
    vi.advanceTimersByTime(1000)
    store.showToast('zweite')

    vi.advanceTimersByTime(TOAST_DURATION_MS - 1000)

    expect(store.toasts.map((toast) => toast.message)).toEqual(['zweite'])
  })

  it('dismisses a toast on demand and cancels its timer', () => {
    const store = useNotificationStore()
    store.showToast('gespeichert')
    const id = store.toasts[0]!.id

    store.dismissToast(id)

    expect(store.toasts).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores dismissing a toast that is already gone', () => {
    const store = useNotificationStore()
    store.showToast('gespeichert')

    store.dismissToast(999)

    expect(store.toasts).toHaveLength(1)
  })
})

describe('notifications store -- confirmation', () => {
  it('has no open question initially', () => {
    expect(useNotificationStore().confirmationMessage).toBeNull()
  })

  it('exposes the question and resolves true when confirmed', async () => {
    const store = useNotificationStore()

    const answer = store.requestConfirmation('Wirklich löschen?')
    expect(store.confirmationMessage).toBe('Wirklich löschen?')

    store.answerConfirmation(true)

    await expect(answer).resolves.toBe(true)
    expect(store.confirmationMessage).toBeNull()
  })

  it('resolves false when denied', async () => {
    const store = useNotificationStore()
    const answer = store.requestConfirmation('Wirklich löschen?')

    store.answerConfirmation(false)

    await expect(answer).resolves.toBe(false)
  })

  it('answers an unanswered question with "no" when a newer one replaces it', async () => {
    const store = useNotificationStore()
    const first = store.requestConfirmation('erste Frage')

    const second = store.requestConfirmation('zweite Frage')

    await expect(first).resolves.toBe(false)
    expect(store.confirmationMessage).toBe('zweite Frage')
    store.answerConfirmation(true)
    await expect(second).resolves.toBe(true)
  })

  it('ignores an answer when nothing was asked', () => {
    const store = useNotificationStore()

    expect(() => store.answerConfirmation(true)).not.toThrow()
    expect(store.confirmationMessage).toBeNull()
  })

  it('cannot settle the same question twice', async () => {
    const store = useNotificationStore()
    const answer = store.requestConfirmation('Wirklich löschen?')

    store.answerConfirmation(true)
    store.answerConfirmation(false)

    await expect(answer).resolves.toBe(true)
  })
})
