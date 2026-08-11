import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UserAdministrationSearchView from '../UserAdministrationSearchView.vue'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'
import type { UserAdministrationDeletedEntry } from '@/composables/useUserAdministration'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockSearch = vi.fn()
const mockListDeleted = vi.fn()
vi.mock('@/composables/useUserAdministration', () => ({
  useUserAdministration: () => ({ search: mockSearch, listDeleted: mockListDeleted }),
}))

const deletedUsers: UserAdministrationDeletedEntry[] = [
  { id: 9, surname: 'ABICHT', givenname: 'Luis', email: 'luis.abicht@gmx.at' },
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

    await wrapper.findComponent(SearchTypeahead).vm.$emit('select', 9)

    expect(mockPush).toHaveBeenCalledWith({
      name: 'administrator-users-show',
      params: { id: 9 },
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
      params: { id: 9 },
    })
  })

  it('omits the deleted-users section when there are none', async () => {
    const wrapper = mount(UserAdministrationSearchView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Liste gelöschter Benutzerkonten')
  })
})
