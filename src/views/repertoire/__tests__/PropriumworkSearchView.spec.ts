import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PropriumworkSearchView from '../PropriumworkSearchView.vue'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockSearch = vi.fn()
vi.mock('@/composables/usePropriumworks', () => ({
  usePropriumworks: () => ({ search: mockSearch }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PropriumworkSearchView', () => {
  it('renders the title and the create link', () => {
    const wrapper = mount(PropriumworkSearchView)

    expect(wrapper.text()).toContain('Proprium-Kompositionen')
    expect(wrapper.find('a.btn.btn-primary').text()).toBe('Proprium-Komposition erstellen')
  })

  it('navigates to the show route when a search result is selected', async () => {
    const wrapper = mount(PropriumworkSearchView)

    await wrapper.findComponent(SearchTypeahead).vm.$emit('select', 4)

    expect(mockPush).toHaveBeenCalledWith({
      name: 'repertoire-propriumworks-show',
      params: { id: 4 },
    })
  })
})
