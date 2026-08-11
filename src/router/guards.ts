import type { NavigationGuardWithThis } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    // Static per-route permission (e.g. 'artistMaintain') -- unlike the
    // Coreelement pool's `:type`-dependent permission (coreelementGuard.ts),
    // every Repertoire route needs exactly one fixed permission known at
    // route-declaration time, so a plain `meta` field is enough here.
    requiredPermission?: string
  }
}

// 1:1 Legacy's `verified` middleware on the whole `content.*` route group --
// an unverified user can reach nothing except the notice page and the
// token-consuming verify-email page itself (clicking the actual link while
// already logged in elsewhere must still work).
const EXEMPT_FROM_VERIFIED_GATE = new Set(['verify-email-notice', 'verify-email'])

function blockedByVerifiedGate(authStore: ReturnType<typeof useAuthStore>, toName: unknown) {
  return (
    authStore.isAuthenticated &&
    !authStore.user?.email_verified_at &&
    !EXEMPT_FROM_VERIFIED_GATE.has(String(toName))
  )
}

// restoreSession() is idempotent (see stores/auth.ts) -- calling it on
// every navigation is deliberate and cheap, not just on the very first one,
// so a fresh access token/profile is picked up even if this guard somehow
// runs before the very first paint (e.g. a direct deep link).
export const runAuthGuards: NavigationGuardWithThis<undefined> = async (to) => {
  const authStore = useAuthStore()
  await authStore.restoreSession()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (blockedByVerifiedGate(authStore, to.name)) {
    return { name: 'verify-email-notice' }
  }

  if (to.meta.requiredPermission && !authStore.hasPermission(to.meta.requiredPermission)) {
    return { name: 'home' }
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return { name: 'home' }
  }

  return true
}
