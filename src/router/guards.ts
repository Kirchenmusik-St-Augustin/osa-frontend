import type { NavigationGuardWithThis } from 'vue-router'

// Placeholder for the Auth slice's real guard chain (session restore, auth
// requirement, permission checks -- see the vb-fastapi-vue sister project's
// router/guards.ts for the target shape). Wired into router.beforeEach()
// now, deliberately a no-op, so the Auth slice only has to fill this in
// rather than touch router/index.ts.
export const runAuthGuards: NavigationGuardWithThis<undefined> = () => true
