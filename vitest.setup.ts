import { config, RouterLinkStub } from '@vue/test-utils'

// RouterLink/RouterView aren't globally registered outside a real router
// instance -- stub them globally so layout/nav components can be mounted in
// isolation without wiring a full router into every test. RouterLinkStub
// (not a bare `true` stub) still renders its default slot content, which
// components like AppNavbar rely on for their visible text.
config.global.stubs = {
  RouterLink: RouterLinkStub,
  RouterView: true,
}
