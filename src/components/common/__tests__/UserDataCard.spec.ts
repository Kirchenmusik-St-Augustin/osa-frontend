import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UserDataCard from '../UserDataCard.vue'
import type { User } from '@/composables/useUsers'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    surname: 'SCHINDLER',
    givenname: 'Margot',
    email: null,
    email_verified_at: null,
    phone: '0664 9182108',
    auth_lastsignal: null,
    auth_locked: false,
    administrator: false,
    deletable: true,
    oauth2_bindings: [],
    instruments: [],
    voices: [],
    choirjobs: [{ id: 3, name: 'Substitut' }],
    roles: [],
    ...overrides,
  }
}

describe('UserDataCard', () => {
  it('renders name, phone and abilities', () => {
    const wrapper = mount(UserDataCard, { props: { user: makeUser() } })

    expect(wrapper.text()).toContain('SCHINDLER')
    expect(wrapper.text()).toContain('Margot')
    expect(wrapper.text()).toContain('0664 9182108')
    expect(wrapper.text()).toContain('Substitut')
  })

  it('shows "unbekannt" when no email is set', () => {
    const wrapper = mount(UserDataCard, { props: { user: makeUser({ email: null }) } })
    expect(wrapper.text()).toContain('unbekannt')
  })

  it('shows "nicht verifiziert" for an unverified email', () => {
    const wrapper = mount(UserDataCard, {
      props: { user: makeUser({ email: 'margot@example.com', email_verified_at: null }) },
    })
    expect(wrapper.text()).toContain('nicht verifiziert')
  })

  it('shows the verification date for a verified email', () => {
    const wrapper = mount(UserDataCard, {
      props: {
        user: makeUser({
          email: 'margot@example.com',
          email_verified_at: '2023-12-28T16:50:00+00:00',
        }),
      },
    })
    expect(wrapper.text()).toContain('E-Mail-Adresse verifiziert am:')
  })

  it('shows "nicht bekannt" when auth_lastsignal is unset', () => {
    const wrapper = mount(UserDataCard, { props: { user: makeUser({ auth_lastsignal: null }) } })
    expect(wrapper.text()).toContain('nicht bekannt')
  })

  it('shows the administrator and gesperrt badges only when set', () => {
    const wrapper = mount(UserDataCard, {
      props: { user: makeUser({ administrator: true, auth_locked: true }) },
    })
    expect(wrapper.text()).toContain('Benutzer ist Administrator')
    expect(wrapper.text()).toContain('Benutzer ist gesperrt')
  })

  it('omits the badges for a regular, unlocked user', () => {
    const wrapper = mount(UserDataCard, { props: { user: makeUser() } })
    expect(wrapper.text()).not.toContain('Benutzer ist Administrator')
    expect(wrapper.text()).not.toContain('Benutzer ist gesperrt')
  })
})
