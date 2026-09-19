import { useNotificationStore } from '@/stores/notifications'

// Imperative entry points for user feedback, used app-wide for
// destructive-action confirmation and success/error toasts. The state lives
// in stores/notifications.ts; App.vue mounts the components that render it.
export function confirmAction(
  message = 'Soll diese Aktion wirklich ausgeführt werden',
): Promise<boolean> {
  return useNotificationStore().requestConfirmation(message)
}

export function showToast(message: string, isError = false): void {
  useNotificationStore().showToast(message, isError)
}
