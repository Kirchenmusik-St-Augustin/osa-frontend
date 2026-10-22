import { defineStore } from 'pinia'
import { ref } from 'vue'

// How long a success toast stays on screen. ToastHost.vue times its progress
// bar with the same value, so the bar empties exactly when the toast is
// dismissed. Error toasts carry the explanation the user has to act on and
// stay until they are closed (an unreadable, self-vanishing error message
// fails WCAG 2.2.1 "Timing Adjustable").
export const TOAST_DURATION_MS = 4000

// Error toasts stay until closed, so a failing loop (retried saves, a broken
// endpoint polled by several components) must not stack them without limit:
// beyond this many, the oldest toast makes room.
export const MAX_VISIBLE_TOASTS = 5

export interface Toast {
  id: number
  message: string
  isError: boolean
}

// Backs the app-wide user feedback: toasts (components/layout/ToastHost.vue)
// and yes/no confirmations (components/layout/ConfirmDialog.vue). Driven
// imperatively through services/notifications.ts, so any code path -- not
// just components -- can raise a toast or ask a question and await the answer.
export const useNotificationStore = defineStore('notifications', () => {
  const toasts = ref<Toast[]>([])
  const confirmationMessage = ref<string | null>(null)

  let nextToastId = 0
  let settleConfirmation: ((confirmed: boolean) => void) | null = null
  const dismissTimers = new Map<number, ReturnType<typeof setTimeout>>()

  function dismissToast(id: number): void {
    clearTimeout(dismissTimers.get(id))
    dismissTimers.delete(id)
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function showToast(message: string, isError = false): void {
    const id = nextToastId++
    toasts.value.push({ id, message, isError })
    toasts.value
      .slice(0, Math.max(0, toasts.value.length - MAX_VISIBLE_TOASTS))
      .forEach((overflow) => dismissToast(overflow.id))
    if (isError) return
    dismissTimers.set(
      id,
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS),
    )
  }

  function answerConfirmation(confirmed: boolean): void {
    settleConfirmation?.(confirmed)
    settleConfirmation = null
    confirmationMessage.value = null
  }

  function requestConfirmation(message: string): Promise<boolean> {
    // A newer question replaces an unanswered one, which counts as "no".
    answerConfirmation(false)
    confirmationMessage.value = message
    return new Promise((resolve) => {
      settleConfirmation = resolve
    })
  }

  return {
    toasts,
    confirmationMessage,
    showToast,
    dismissToast,
    requestConfirmation,
    answerConfirmation,
  }
})
