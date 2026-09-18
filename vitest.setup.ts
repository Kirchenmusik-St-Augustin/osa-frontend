import { afterEach } from 'vitest'
import { config, enableAutoUnmount, RouterLinkStub } from '@vue/test-utils'

// Unmount every wrapper after each test: components with global side effects
// (document listeners, the modal scroll lock on <body>) must not leak from one
// test into the next.
enableAutoUnmount(afterEach)

// RouterLink/RouterView aren't globally registered outside a real router
// instance -- stub them globally so layout/nav components can be mounted in
// isolation without wiring a full router into every test. RouterLinkStub
// (not a bare `true` stub) still renders its default slot content, which
// components like AppNavbar rely on for their visible text.
//
// Teleport is stubbed for the same reason: AppModal teleports its dialog to
// <body>, i.e. outside every mounted wrapper, so it would be unreachable from
// wrapper.find(). AppModal's own spec un-stubs it to test the real Teleport.
config.global.stubs = {
  // Assigning `stubs` replaces VTU's built-in defaults, so the two transition
  // stubs are restated: without them <Transition> plays out real
  // requestAnimationFrame-driven leave phases and a closed dialog would linger
  // in the DOM for a few frames.
  transition: true,
  'transition-group': true,
  RouterLink: RouterLinkStub,
  RouterView: true,
  teleport: true,
}
