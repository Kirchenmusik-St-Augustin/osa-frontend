import { describe, expect, it } from 'vitest'
import router from '../index'
import { COREELEMENT_TYPES } from '@/constants/coreelementTypes'

// The permission names the server can grant (calculate_permissions in the
// backend's permission service); a route naming anything else can never be
// opened by anybody.
const SERVER_PERMISSIONS = new Set([
  'artistMaintain',
  'choirjobMaintain',
  'feeMaintain',
  'instrumentMaintain',
  'locationMaintain',
  'ordinariumworkMaintain',
  'performanceBilling',
  'performanceCast',
  'performanceChangeUserStatus',
  'performanceMaintain',
  'propriumelementMaintain',
  'propriumworkMaintain',
  'requestLogView',
  'roleMaintain',
  'schedulerTrigger',
  'schedulerView',
  'scoreMaintain',
  'sentEmailView',
  'shorturlMaintain',
  'sqlInspectorView',
  'userAdministrate',
  'userMaintain',
  'voiceMaintain',
])

// The only routes a logged-out visitor may open without being sent to login:
// the guest pages themselves, the token-consuming e-mail link and the 404.
const PUBLIC_ROUTES = new Set([
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  'not-found',
])

const namedRoutes = router.getRoutes().filter((route) => route.name !== undefined)

describe('route metadata', () => {
  it('requires authentication on every route except the public ones', () => {
    const open = namedRoutes
      .filter((route) => !route.meta.requiresAuth)
      .map((route) => String(route.name))
      .sort()

    expect(open).toEqual([...PUBLIC_ROUTES].sort())
  })

  it('never combines requiredPermission with a missing requiresAuth', () => {
    // runAuthGuards sends a logged-out visitor of such a route to "home"
    // instead of to the login page.
    const broken = namedRoutes
      .filter((route) => route.meta.requiredPermission && !route.meta.requiresAuth)
      .map((route) => String(route.name))

    expect(broken).toEqual([])
  })

  it('only names permissions the server can grant', () => {
    const unknown = namedRoutes
      .map((route) => route.meta.requiredPermission)
      .filter((permission): permission is string => permission !== undefined)
      .filter((permission) => !SERVER_PERMISSIONS.has(permission))

    expect(unknown).toEqual([])
  })

  it('only names grantable permissions in the Coreelement registry', () => {
    const unknown = COREELEMENT_TYPES.map((meta) => meta.permission).filter(
      (permission) => !SERVER_PERMISSIONS.has(permission),
    )

    expect(unknown).toEqual([])
  })

  it('guards the Coreelement pool with its type-dependent beforeEnter guard', () => {
    const route = namedRoutes.find((candidate) => candidate.name === 'administrator-coreelement')

    expect(route?.meta.requiresAuth).toBe(true)
    expect(route?.beforeEnter).toBeTypeOf('function')
  })

  it('gates every guest-only route as such', () => {
    const guestOnly = namedRoutes
      .filter((route) => route.meta.requiresGuest)
      .map((route) => String(route.name))
      .sort()

    expect(guestOnly).toEqual(['forgot-password', 'login', 'register', 'reset-password'])
  })
})
