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
  user: { surname: string; givenname: string; administrator?: boolean } | null
} = { isAuthenticated: false, user: null }

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get isAuthenticated() {
      return mockAuthState.isAuthenticated
    },
    get user() {
      return mockAuthState.user
    },
    logout: mockLogout,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthState = { isAuthenticated: false, user: null }
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
    }
    mockLogout.mockResolvedValueOnce(undefined)
    const wrapper = mount(AppNavbar)

    await wrapper.find('button.dropdown-item').trigger('click')
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())

    expect(mockLogout).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('hides the Administrator dropdown for a non-administrator', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max', administrator: false },
    }
    const wrapper = mount(AppNavbar)

    expect(wrapper.text()).not.toContain('Administrator')
  })

  it('shows the Administrator dropdown with all six Coreelement links for an administrator', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { surname: 'MUSTER', givenname: 'Max', administrator: true },
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
    ]) {
      expect(wrapper.text()).toContain(label)
    }
  })
})
