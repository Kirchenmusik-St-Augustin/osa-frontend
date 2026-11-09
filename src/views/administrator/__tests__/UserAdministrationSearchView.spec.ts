import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UserAdministrationSearchView from '../UserAdministrationSearchView.vue'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'
import type { UserAdministrationDeletedEntry } from '@/composables/useUserAdministration'
import { testId } from '@/__tests__/testId'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

const mockSearch = vi.fn()
const mockListDeleted = vi.fn()
vi.mock('@/composables/useUserAdministration', () => ({
  useUserAdministration: () => ({ search: mockSearch, listDeleted: mockListDeleted }),
}))

const deletedUsers: UserAdministrationDeletedEntry[] = [
  { id: testId(9), surname: 'ABICHT', givenname: 'Luis', email: 'luis.abicht@gmx.at' },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockListDeleted.mockResolvedValue([])
})

describe('UserAdministrationSearchView', () => {
  it('renders the title and passes the composable search function to the typeahead', async () => {
    const wrapper = mount(UserAdministrationSearchView)
    await flushPromises()

    expect(wrapper.text()).toContain('Benutzerkonten administrieren')
    expect(wrapper.findComponent(SearchTypeahead).props('search')).toBe(mockSearch)
  })

  it('navigates to the show route when a search result is selected', async () => {
    const wrapper = mount(UserAdministrationSearchView)
    await flushPromises()

    await wrapper.findComponent(SearchTypeahead).vm.$emit('select', testId(9))

    expect(mockPush).toHaveBeenCalledWith({
      name: 'administrator-users-show',
      params: { id: testId(9) },
    })
  })

  it('lists deleted users with name and email, linking to their show page', async () => {
    mockListDeleted.mockResolvedValueOnce(deletedUsers)
    const wrapper = mount(UserAdministrationSearchView)
    await flushPromises()

    expect(wrapper.text()).toContain('Liste gelöschter Benutzerkonten')
    expect(wrapper.text()).toContain('ABICHT, Luis (luis.abicht@gmx.at)')
    const link = wrapper.findComponent({ name: 'RouterLinkStub' })
    expect(link.props('to')).toEqual({
      name: 'administrator-users-show',
      params: { id: testId(9) },
    })
  })

  it('tells the administrator when the deleted-users list cannot be loaded', async () => {
    mockListDeleted.mockRejectedValueOnce(new Error('network'))
    const wrapper = mount(UserAdministrationSearchView, {
      global: { stubs: { RouterLink: true } },
    })
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein unerwarteter Fehler ist aufgetreten.', true)
    expect(wrapper.text()).not.toContain('Liste gelöschter Benutzerkonten')
  })

  it('omits the deleted-users section when there are none', async () => {
    const wrapper = mount(UserAdministrationSearchView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Liste gelöschter Benutzerkonten')
  })

  it('uses its own text when the load error carries no message of its own', async () => {
    mockListDeleted.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'x'], msg: 'Ungültig.' }] } },
    })
    mount(UserAdministrationSearchView, { global: { stubs: { RouterLink: true } } })
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Die Liste konnte nicht geladen werden.', true)
  })
})
