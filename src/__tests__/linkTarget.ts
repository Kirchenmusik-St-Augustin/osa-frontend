import type { RouteLocationNamedRaw } from 'vue-router'

interface PropsReader {
  props(key: string): unknown
}

/** Typed `to` target of a stubbed RouterLink (VTU types component props loosely). */
export const linkTarget = (link: PropsReader | undefined): RouteLocationNamedRaw | undefined =>
  link?.props('to') as RouteLocationNamedRaw | undefined
