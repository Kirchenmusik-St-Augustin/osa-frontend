import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { coreelementRouteGuard } from '../coreelementGuard'

const mockHasPermission = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ hasPermission: mockHasPermission }),
}))

function makeRoute(type: string): RouteLocationNormalized {
  return { params: { type } } as unknown as RouteLocationNormalized
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('coreelementRouteGuard', () => {
  it('allows navigation when the user has the matching permission', () => {
    mockHasPermission.mockReturnValue(true)

    const result = coreelementRouteGuard(makeRoute('instrument'), makeRoute('instrument'), vi.fn())

    expect(result).toBe(true)
    expect(mockHasPermission).toHaveBeenCalledWith('instrumentMaintain')
  })

  it('resolves the correct permission per type', () => {
    mockHasPermission.mockReturnValue(true)

    coreelementRouteGuard(makeRoute('role'), makeRoute('role'), vi.fn())

    expect(mockHasPermission).toHaveBeenCalledWith('roleMaintain')
  })

  it('redirects home when the user lacks the matching permission', () => {
    mockHasPermission.mockReturnValue(false)

    const result = coreelementRouteGuard(makeRoute('location'), makeRoute('location'), vi.fn())

    expect(result).toEqual({ name: 'home' })
  })

  it('redirects home for an unknown/unrecognized type', () => {
    mockHasPermission.mockReturnValue(true)

    const result = coreelementRouteGuard(makeRoute('bogus'), makeRoute('bogus'), vi.fn())

    expect(result).toEqual({ name: 'home' })
  })
})
