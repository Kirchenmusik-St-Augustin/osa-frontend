import type { NavigationHookAfter } from 'vue-router'
import { findCoreelementTypeMeta } from '@/constants/coreelementTypes'

declare module 'vue-router' {
  interface RouteMeta {
    // The per-page title, read by setPageTitle below, which appends
    // " - einteilung.hochamt.at" so the browser tab always names the
    // current subpage.
    title?: string
  }
}

const APP_TITLE_SUFFIX = 'einteilung.hochamt.at'

export const setPageTitle: NavigationHookAfter = (to) => {
  // The one dynamic case: Coreelement's single generic page covers six
  // types (instrument/voice/choirjob/location/role/propriumelement, see
  // constants/coreelementTypes.ts) -- titled from the same registry that
  // already backs this route's Navbar dropdown entries and permission
  // guard.
  const title =
    to.name === 'administrator-coreelement'
      ? (findCoreelementTypeMeta(String(to.params['type']))?.label ?? '')
      : (to.meta.title ?? '')
  document.title = title ? `${title} - ${APP_TITLE_SUFFIX}` : APP_TITLE_SUFFIX
}
