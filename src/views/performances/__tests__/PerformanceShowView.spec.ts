import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import PerformanceShowView from '../PerformanceShowView.vue'
import type { PerformanceShow } from '@/composables/usePerformances'

const mockGetDetail = vi.fn()
vi.mock('@/composables/usePerformances', () => ({
  usePerformances: () => ({ getDetail: mockGetDetail }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ hasPermission: () => false }),
}))

function makeShow(overrides: Partial<PerformanceShow> = {}): PerformanceShow {
  return {
    id: 1,
    schedule: '2026-08-02T11:00:00',
    location: { id: 1, name: 'Augustinerkirche', color: '336699', address: null },
    ordinariumwork_id: 5,
    ordinariumwork_name: 'Krönungsmesse',
    ordinariumwork_artist_name: 'MOZART, Wolfgang',
    ordinariumwork_artist_description: null,
    ordinariumwork_description: null,
    ordinariumwork_demanding: false,
    artist_id: null,
    artist_name: null,
    artist_description: null,
    description: null,
    rehearsals: [],
    setup: { instruments: [], voices: [], choirjobs: [] },
    proprium: [],
    demanding_proprium: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('PerformanceShowView', () => {
  it('fetches and renders the performance by id', async () => {
    mockGetDetail.mockResolvedValueOnce(makeShow())
    const wrapper = mount(PerformanceShowView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGetDetail).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Krönungsmesse')
  })

  it('never renders a Besetzung/cast section (disabled 1:1 Legacy)', async () => {
    mockGetDetail.mockResolvedValueOnce(makeShow())
    const wrapper = mount(PerformanceShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Besetzung')
    expect(wrapper.text()).not.toContain('Aufstellung')
  })

  it('only shows togglers for fields that actually have content', async () => {
    mockGetDetail.mockResolvedValueOnce(makeShow())
    const wrapper = mount(PerformanceShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Details zum Ordinarium')
    expect(wrapper.text()).not.toContain('Details zum Komponisten')
    expect(wrapper.text()).not.toContain('Adresse')
  })

  it('shows the composer-description toggler when present, expanded on click', async () => {
    mockGetDetail.mockResolvedValueOnce(
      makeShow({ ordinariumwork_artist_description: 'Wiener Klassik' }),
    )
    const wrapper = mount(PerformanceShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Details zum Komponisten')
    expect(wrapper.text()).not.toContain('Wiener Klassik')
    await wrapper.find('.c-pointer').trigger('click')
    expect(wrapper.text()).toContain('Wiener Klassik')
  })

  it('links back to the calendar month of the performance schedule', async () => {
    mockGetDetail.mockResolvedValueOnce(makeShow({ schedule: '2026-03-15T11:00:00' }))
    const wrapper = mount(PerformanceShowView, { props: { id: '1' } })
    await flushPromises()

    const backLink = wrapper.findComponent(RouterLinkStub)
    expect(backLink.props('to')).toEqual({ name: 'home', query: { year: 2026, month: 3 } })
  })
})
