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

  if (to.meta.requiredPermission && !authStore.hasPermission(to.meta.requiredPermission)) {
    return { name: 'home' }
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return { name: 'home' }
  }

  return true
}
