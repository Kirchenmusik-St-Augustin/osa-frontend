import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreSearchView from '../ScoreSearchView.vue'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockSearch = vi.fn()
vi.mock('@/composables/useScores', () => ({
  useScores: () => ({ search: mockSearch }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ScoreSearchView', () => {
  it('renders the "Noten-Archiv" title and an "anlegen" link to the create route', () => {
    const wrapper = mount(ScoreSearchView)

    expect(wrapper.text()).toContain('Noten-Archiv')
    const link = wrapper.find('a.btn.btn-primary')
    expect(link.text()).toBe('anlegen')
  })

  it('passes the composable search function to the typeahead', () => {
    const wrapper = mount(ScoreSearchView)

    expect(wrapper.findComponent(SearchTypeahead).props('search')).toBe(mockSearch)
  })

  it('navigates to the show route when a search result is selected', async () => {
    const wrapper = mount(ScoreSearchView)

    await wrapper.findComponent(SearchTypeahead).vm.$emit('select', 9)

    expect(mockPush).toHaveBeenCalledWith({
      name: 'repertoire-scores-show',
      params: { id: 9 },
    })
  })
})
