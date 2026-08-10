import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppNavbar from '../AppNavbar.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

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
  })

  it('shows all three Repertoire links with all permissions', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max' },
      permissions: ['artistMaintain', 'ordinariumworkMaintain', 'propriumworkMaintain'],
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).toContain('Ordinarium-Werke')
    expect(wrapper.text()).toContain('Proprium-Werke')
    expect(wrapper.text()).toContain('Komponisten und Dirigenten')
  })
})
