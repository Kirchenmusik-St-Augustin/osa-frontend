import { onBeforeUnmount, watch, type Ref } from 'vue'

// Shared by every caller: closing one of two stacked modals must not unlock
// the page while the other one is still open.
let activeLocks = 0

function acquireLock(): void {
  activeLocks += 1
  if (activeLocks > 1) return
  // Width of the scrollbar that disappears with `overflow: hidden`; app.scss
  // pads the body by exactly that much so the page does not jump sideways.
  const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
  document.body.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`)
  document.body.classList.add('modal-open')
}

function releaseLock(): void {
  activeLocks -= 1
  if (activeLocks > 0) return
  document.body.classList.remove('modal-open')
  document.body.style.removeProperty('--scrollbar-compensation')
}

// Locks page scrolling while `isLocked` is true. The lock is always released
// when the calling component unmounts, so navigating away with an open modal
// can never leave the page stuck unscrollable.
export function useBodyScrollLock(isLocked: Readonly<Ref<boolean>>): void {
  let holdsLock = false

  function sync(shouldLock: boolean): void {
    if (shouldLock === holdsLock) return
    holdsLock = shouldLock
    if (shouldLock) acquireLock()
    else releaseLock()
  }

  watch(isLocked, sync, { immediate: true })
  onBeforeUnmount(() => sync(false))
}
