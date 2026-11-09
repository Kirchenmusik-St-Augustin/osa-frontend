import type { Router } from 'vue-router'

// Vite fingerprints every lazy-loaded chunk with a content hash that
// changes on each build. A tab left open across a deployment still holds
// the previous index.html, so navigating to a not-yet-loaded route there
// requests chunk files the current server no longer has -- browsers report
// that failure with one of these messages (wording differs per engine).
const CHUNK_LOAD_ERROR_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css/i
// Guards against reloading forever if a chunk load fails for some other,
// persistent reason -- cleared on the next successful navigation.
const CHUNK_RELOAD_FLAG = 'chunk-reload-attempted'

export function isChunkLoadError(message: string): boolean {
  return CHUNK_LOAD_ERROR_PATTERN.test(message)
}

// Storage can be unavailable (blocked site data, some private modes) or
// silently drop writes. Without a flag that provably persisted, a reload
// could repeat forever, so "could not remember" means "do not reload".
function claimReloadAttempt(): boolean {
  try {
    if (window.sessionStorage.getItem(CHUNK_RELOAD_FLAG)) return false
    window.sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1')
    return window.sessionStorage.getItem(CHUNK_RELOAD_FLAG) === '1'
  } catch {
    return false
  }
}

function clearReloadAttempt(): void {
  try {
    window.sessionStorage.removeItem(CHUNK_RELOAD_FLAG)
  } catch {
    // Nothing was stored, so there is nothing to clear.
  }
}

export function registerChunkReload(router: Router): void {
  router.afterEach(clearReloadAttempt)

  router.onError((error: unknown, to) => {
    const message = error instanceof Error ? error.message : String(error)
    if (!isChunkLoadError(message)) return
    if (!claimReloadAttempt()) return

    window.location.href = to.fullPath
  })
}
