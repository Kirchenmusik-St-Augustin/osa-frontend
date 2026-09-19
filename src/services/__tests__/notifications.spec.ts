import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { confirmAction, showToast } from '../notifications'
import { useNotificationStore } from '@/stores/notifications'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('confirmAction', () => {
  it('asks the given question and resolves true when the user confirms', async () => {
    const store = useNotificationStore()

    const answer = confirmAction('Soll das Element wirklich gelöscht werden?')
    expect(store.confirmationMessage).toBe('Soll das Element wirklich gelöscht werden?')
    store.answerConfirmation(true)

    await expect(answer).resolves.toBe(true)
  })

  it('resolves false when the user denies', async () => {
    const store = useNotificationStore()

    const answer = confirmAction()
    store.answerConfirmation(false)

    await expect(answer).resolves.toBe(false)
  })

  it('falls back to a generic question when none is given', () => {
    const store = useNotificationStore()

    void confirmAction()

    expect(store.confirmationMessage).toBe('Soll diese Aktion wirklich ausgeführt werden')
  })
})

describe('showToast', () => {
  it('raises a success toast by default', () => {
    showToast('Element gespeichert')

    expect(useNotificationStore().toasts).toEqual([
      { id: expect.any(Number), message: 'Element gespeichert', isError: false },
    ])
  })

  it('raises an error toast when isError is true', () => {
    showToast('Ein unerwarteter Fehler ist aufgetreten.', true)

    expect(useNotificationStore().toasts[0]).toMatchObject({ isError: true })
  })
})
