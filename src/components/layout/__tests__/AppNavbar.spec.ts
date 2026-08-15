import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppNavbar from '../AppNavbar.vue'

// vi.mock(...) factories are hoisted above plain const declarations --
// referencing mock functions inside them requires vi.hoisted() (already
// established project gotcha, see feedback_frontend_gotchas memory),
// otherwise it's a "Cannot access before initialization" TDZ error.
const { mockPush, mockAfterEach, mockRemoveAfterEachHook } = vi.hoisted(() => {
  const mockRemoveAfterEachHook = vi.fn()
  return {
    mockPush: vi.fn().mockResolvedValue(undefined),
    mockRemoveAfterEachHook,
    mockAfterEach: vi.fn().mockReturnValue(mockRemoveAfterEachHook),
  }
})
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush, afterEach: mockAfterEach }),
}))

// Bootstrap's real Collapse manipulates DOM classes via CSS transitions
// jsdom doesn't implement -- stubbed minimally instead (same established
// pattern as vuedraggable/vue-flatpickr-component elsewhere in this repo),
// so the afterEach hook's Collapse(...).hide() call can be asserted
// directly without depending on any real transition behavior.
const { mockCollapse, mockCollapseHide } = vi.hoisted(() => {
  const mockCollapseHide = vi.fn()
  // Called with `new` in AppNavbar.vue -- mockReturnValue doesn't support
  // that (Vitest requires mockImplementation with a class for constructor
  // mocks), hence the class expression here instead of a plain factory.
  const mockCollapse = vi.fn().mockImplementation(
    class {
      hide = mockCollapseHide
    },
  )
  return { mockCollapseHide, mockCollapse }
})
vi.mock('bootstrap', () => ({ Collapse: mockCollapse }))

const mockLogout = vi.fn()
let mockAuthState: {
  isAuthenticated: boolean
  user: {
    surname: string
    givenname: string
    administrator?: boolean
    email_kill_switch?: { active: boolean; period_days: number; threshold: number }
  } | null
  permissions: string[]
} = { isAuthenticated: false, user: null, permissions: [] }

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get isAuthenticated() {
      return mockAuthState.isAuthenticated
    },
    get user() {
      return mockAuthState.user
    },
    hasPermission: (permission: string) => mockAuthState.permissions.includes(permission),
    logout: mockLogout,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthState = { isAuthenticated: false, user: null, permissions: [] }
})

describe('AppNavbar', () => {
  it('renders the legacy brand text', () => {
    expect(mount(AppNavbar).text()).toContain('Orchester-Einteilung')
  })

  it('renders a Bootstrap navbar-toggler for mobile', () => {
    expect(mount(AppNavbar).find('.navbar-toggler').exists()).toBe(true)
  })

  it('uses the legacy text-bg-primary/dark theming', () => {
    const wrapper = mount(AppNavbar)
    const nav = wrapper.find('nav')
    expect(nav.classes()).toContain('text-bg-primary')
    expect(nav.attributes('data-bs-theme')).toBe('dark')
  })

  it('shows a "Log in" link when logged out', () => {
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('Log in')
    expect(wrapper.text()).not.toContain('Abmelden')
  })

  it('shows the user name and a logout option when logged in', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: [],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('MUSTER, Max')
    expect(wrapper.text()).toContain('Abmelden')
    expect(wrapper.text()).not.toContain('Log in')
  })

  it('logs out and redirects to login when "Abmelden" is clicked', async () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: [],
    }
    mockLogout.mockResolvedValueOnce(undefined)
    const wrapper = mount(AppNavbar)

    await wrapper.find('button.dropdown-item').trigger('click')
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())

    expect(mockLogout).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('shows the three self-service links in the user dropdown when logged in', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: [],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('Mein Benutzerkonto')
    expect(wrapper.text()).toContain('Meine Anfragen und Buchungen')
    expect(wrapper.text()).toContain('Meine Ansprechpersonen')
  })

  it('shows the email kill-switch warning icon next to the username while active', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: {
        surname: 'MUSTER',
        givenname: 'Max',
        email_kill_switch: { active: true, period_days: 30, threshold: 100 },
      },
      permissions: [],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.find('.fa-triangle-exclamation').exists()).toBe(true)
  })

  it('hides the email kill-switch warning icon while inactive', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: {
        surname: 'MUSTER',
        givenname: 'Max',
        email_kill_switch: { active: false, period_days: 30, threshold: 100 },
      },
      permissions: [],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.find('.fa-triangle-exclamation').exists()).toBe(false)
  })

  it('hides the Administrator dropdown for a non-administrator', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max', administrator: false },
      permissions: [],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).not.toContain('Administrator')
  })

  it('shows the Administrator dropdown with all six Coreelement links plus Benutzerkonten (Administration) for an administrator', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max', administrator: true },
      permissions: [],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('Administrator')
    for (const label of [
      'Instrumente',
      'Stimmen',
      'Choraufgaben',
      'Proprium-Elemente',
      'Orte',
      'Rollen',
      'Benutzerkonten (Administration)',
    ]) {
      expect(wrapper.text()).toContain(label)
    }
  })

  it('hides "Versandte E-Mails ansehen"/"Logbuch" for an administrator without sentEmailView/requestLogView', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max', administrator: true },
      permissions: [],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).not.toContain('Versandte E-Mails ansehen')
    expect(wrapper.text()).not.toContain('Logbuch')
  })

  it('shows "Versandte E-Mails ansehen"/"Logbuch" for an administrator with sentEmailView/requestLogView', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max', administrator: true },
      permissions: ['sentEmailView', 'requestLogView'],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('Versandte E-Mails ansehen')
    expect(wrapper.text()).toContain('Logbuch')
  })

  it('shows the "Statistiken" link in the user dropdown for any authenticated user', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: [],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('Statistiken')
  })

  it('hides the System dropdown without the feeMaintain permission', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: [],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).not.toContain('System')
  })

  it('shows the System dropdown with all three links, in Legacy order, for a user with feeMaintain', () => {
    // Legacy's System menu is gated on role 'disponent' (AuthLeftMenu.vue)
    // -- feeMaintain mirrors that role gate 1:1 (see permission_service.py).
    // Deliberately NOT gated by the administrator flag, unlike the
    // Coreelement types in the Administrator dropdown above. Order matches
    // Legacy exactly: Benutzerverzeichnis, Benutzerkonten verwalten, Tarife
    // verwalten.
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max', administrator: false },
      permissions: ['feeMaintain'],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('System')
    const text = wrapper.text()
    expect(text.indexOf('Benutzerverzeichnis')).toBeLessThan(
      text.indexOf('Benutzerkonten verwalten'),
    )
    expect(text.indexOf('Benutzerkonten verwalten')).toBeLessThan(text.indexOf('Tarife verwalten'))
    expect(wrapper.text()).not.toContain('Administrator')
  })

  it('hides the Repertoire dropdown without any of its three permissions', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: [],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).not.toContain('Repertoire')
  })

  it('shows only the permitted Repertoire links', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: ['ordinariumworkMaintain'],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('Repertoire')
    expect(wrapper.text()).toContain('Ordinarium-Werke')
    expect(wrapper.text()).not.toContain('Proprium-Werke')
    expect(wrapper.text()).not.toContain('Komponisten und Dirigenten')
    expect(wrapper.text()).not.toContain('Notenarchiv')
  })

  it('shows only "Notenarchiv" with just scoreMaintain (Schritt 8)', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: ['scoreMaintain'],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('Repertoire')
    expect(wrapper.text()).toContain('Notenarchiv')
    expect(wrapper.text()).not.toContain('Ordinarium-Werke')
  })

  it('shows all four Repertoire links with all permissions, Notenarchiv last', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: [
        'artistMaintain',
        'ordinariumworkMaintain',
        'propriumworkMaintain',
        'scoreMaintain',
      ],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('Ordinarium-Werke')
    expect(wrapper.text()).toContain('Proprium-Werke')
    expect(wrapper.text()).toContain('Komponisten und Dirigenten')
    expect(wrapper.text()).toContain('Notenarchiv')
    // 1:1 Legacy's AuthLeftMenu.vue order: Ordinarium/Proprium/Komponisten
    // first, Notenarchiv last.
    const links = wrapper
      .findAll('.dropdown-item')
      .map((link) => link.text())
      .filter((text) =>
        [
          'Ordinarium-Werke',
          'Proprium-Werke',
          'Komponisten und Dirigenten',
          'Notenarchiv',
        ].includes(text),
      )
    expect(links).toEqual([
      'Ordinarium-Werke',
      'Proprium-Werke',
      'Komponisten und Dirigenten',
      'Notenarchiv',
    ])
  })

  it('hides "Kurz-URLs" without shorturlMaintain', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: [],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).not.toContain('Kurz-URLs')
  })

  it('shows "Kurz-URLs" as a standalone link with shorturlMaintain', () => {
    // 1:1 Legacy's AuthLeftMenu.vue: a standalone top-level nav item (not
    // a dropdown), gated on role 'shorturls'.
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: ['shorturlMaintain'],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('Kurz-URLs')
    const link = wrapper.findAll('a.btn').find((el) => el.text() === 'Kurz-URLs')
    expect(link).toBeDefined()
  })

  describe('burger menu closes on navigation (Legacy parity)', () => {
    it('registers a router.afterEach hook that force-closes #mainNavBar via Bootstrap Collapse', () => {
      const wrapper = mount(AppNavbar, { attachTo: document.body })

      expect(mockAfterEach).toHaveBeenCalledOnce()
      const navigationHook = mockAfterEach.mock.calls[0]?.[0] as () => void
      navigationHook()

      expect(mockCollapse).toHaveBeenCalledWith(document.getElementById('mainNavBar'), {
        toggle: false,
      })
      expect(mockCollapseHide).toHaveBeenCalledOnce()
      wrapper.unmount()
    })

    it('unregisters the afterEach hook on unmount', () => {
      const wrapper = mount(AppNavbar)

      wrapper.unmount()

      expect(mockRemoveAfterEachHook).toHaveBeenCalledOnce()
    })
  })
})
