import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ArtistSearchView from '../ArtistSearchView.vue'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockSearch = vi.fn()
vi.mock('@/composables/useArtists', () => ({
  useArtists: () => ({ search: mockSearch }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ArtistSearchView', () => {
  it('renders the title and an "anlegen" link to the create route', () => {
    const wrapper = mount(ArtistSearchView)

    expect(wrapper.text()).toContain('Komponisten und Dirigenten')
    const link = wrapper.find('a.btn.btn-primary')
    expect(link.text()).toBe('anlegen')
  })

  it('passes the composable search function to the typeahead', () => {
    const wrapper = mount(ArtistSearchView)

    expect(wrapper.findComponent(SearchTypeahead).props('search')).toBe(mockSearch)
  })

  it('navigates to the show route when a search result is selected', async () => {
    const wrapper = mount(ArtistSearchView)

    await wrapper.findComponent(SearchTypeahead).vm.$emit('select', 7)

    expect(mockPush).toHaveBeenCalledWith({
      name: 'repertoire-artists-show',
      params: { id: 7 },
    })
  })
})
