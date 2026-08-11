import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router'
import { findCoreelementTypeMeta } from '@/constants/coreelementTypes'
import { useAuthStore } from '@/stores/auth'

// The required permission for /administrator/:type depends on `type`,
// which is only known at navigation time -- can't be expressed as a
// static route `meta` value the way requiresAuth/requiresGuest are (1:1
// the backend's `ensure_permission` reasoning, see auth_guards.py).
export const coreelementRouteGuard: NavigationGuardWithThis<undefined> = (
  to: RouteLocationNormalized,
) => {
  const authStore = useAuthStore()
  const typeMeta = findCoreelementTypeMeta(String(to.params['type']))
  if (!typeMeta || !authStore.hasPermission(typeMeta.permission)) {
    return { name: 'home' }
  }
  return true
}
