import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import OrdinariumworkSearchView from '../OrdinariumworkSearchView.vue'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockSearch = vi.fn()
vi.mock('@/composables/useOrdinariumworks', () => ({
  useOrdinariumworks: () => ({ search: mockSearch }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OrdinariumworkSearchView', () => {
  it('renders the title and the create link', () => {
    const wrapper = mount(OrdinariumworkSearchView)

    expect(wrapper.text()).toContain('Ordinarium-Kompositionen')
    expect(wrapper.find('a.btn.btn-primary').text()).toBe('Ordinarium-Komposition erstellen')
  })

  it('navigates to the show route when a search result is selected', async () => {
    const wrapper = mount(OrdinariumworkSearchView)

    await wrapper.findComponent(SearchTypeahead).vm.$emit('select', 3)

    expect(mockPush).toHaveBeenCalledWith({
      name: 'repertoire-ordinariumworks-show',
      params: { id: 3 },
    })
  })
})
