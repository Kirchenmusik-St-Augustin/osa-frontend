import { onBeforeUnmount, onMounted, type Ref } from 'vue'

// Calls `onOutsideClick` for every document click that did not start inside
// `target`. The event's composed path is used instead of
// `target.contains(event.target)`: it is captured when the event is
// dispatched, whereas Vue flushes DOM updates between the clicked element's
// own handler and this document-level one, so the clicked node may already be
// detached by then and would wrongly count as "outside".
export function useClickOutside(
  target: Readonly<Ref<HTMLElement | null>>,
  onOutsideClick: () => void,
): void {
  function handleDocumentClick(event: MouseEvent): void {
    const element = target.value
    if (element && event.composedPath().includes(element)) return
    onOutsideClick()
  }

  onMounted(() => document.addEventListener('click', handleDocumentClick))
  onBeforeUnmount(() => document.removeEventListener('click', handleDocumentClick))
}
