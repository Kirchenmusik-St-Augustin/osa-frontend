import { describe, expect, it } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { setPageTitle } from '../pageTitle'

function makeRoute(overrides: Partial<RouteLocationNormalized> = {}): RouteLocationNormalized {
  return {
    fullPath: '/',
    path: '/',
    name: undefined,
    params: {},
    query: {},
    hash: '',
    matched: [],
    meta: {},
    redirectedFrom: undefined,
    ...overrides,
  } as RouteLocationNormalized
}

describe('setPageTitle', () => {
  it('appends " - einteilung.hochamt.at" to a static route title, 1:1 Legacy\'s Inertia title callback', () => {
    setPageTitle(makeRoute({ meta: { title: 'Kalender' } }), makeRoute(), undefined)

    expect(document.title).toBe('Kalender - einteilung.hochamt.at')
  })

  it('falls back to the bare app name when a route has no title', () => {
    setPageTitle(makeRoute({ meta: {} }), makeRoute(), undefined)

    expect(document.title).toBe('einteilung.hochamt.at')
  })

  it('derives the title for the Coreelement pool route from its :type param, not a static meta.title', () => {
    setPageTitle(
      makeRoute({ name: 'administrator-coreelement', params: { type: 'voice' } }),
      makeRoute(),
      undefined,
    )

    expect(document.title).toBe('Stimmen - einteilung.hochamt.at')
  })

  it('falls back to the bare app name for an unknown Coreelement :type', () => {
    setPageTitle(
      makeRoute({ name: 'administrator-coreelement', params: { type: 'nonsense' } }),
      makeRoute(),
      undefined,
    )

    expect(document.title).toBe('einteilung.hochamt.at')
  })
})
