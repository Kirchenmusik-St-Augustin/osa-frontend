import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UserSearchView from '../UserSearchView.vue'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockSearch = vi.fn()
vi.mock('@/composables/useUsers', () => ({
  useUsers: () => ({ search: mockSearch }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('UserSearchView', () => {
  it('renders the title and a "Benutzer-Konto erstellen" link to the create route', () => {
    const wrapper = mount(UserSearchView)

    expect(wrapper.text()).toContain('Benutzerkonten verwalten')
    const link = wrapper.find('a.btn.btn-primary')
    expect(link.text()).toBe('Benutzer-Konto erstellen')
  })

  it('passes the composable search function to the typeahead', () => {
    const wrapper = mount(UserSearchView)

    expect(wrapper.findComponent(SearchTypeahead).props('search')).toBe(mockSearch)
  })

  it('navigates to the show route when a search result is selected', async () => {
    const wrapper = mount(UserSearchView)

    await wrapper.findComponent(SearchTypeahead).vm.$emit('select', 7)

    expect(mockPush).toHaveBeenCalledWith({
      name: 'system-users-show',
      params: { id: 7 },
    })
  })
})
