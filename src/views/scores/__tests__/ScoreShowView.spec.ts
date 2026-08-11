import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import ScoreShowView from '../ScoreShowView.vue'
import ScoreFieldsComponent from '@/components/scores/ScoreFieldsComponent.vue'
import type { Score } from '@/composables/useScores'

const mockGet = vi.fn()
const mockGetFieldsConfig = vi.fn()
vi.mock('@/composables/useScores', () => ({
  useScores: () => ({ get: mockGet, getFieldsConfig: mockGetFieldsConfig }),
}))

function makeScore(overrides: Partial<Score> = {}): Score {
  return {
    id: 1,
    created_at: '2026-01-01T10:00:00+00:00',
    updated_at: null,
    fields: { werk: 'Requiem', kasten: 'A' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetFieldsConfig.mockResolvedValue({})
})

describe('ScoreShowView', () => {
  it('loads the score and fields config, rendering the fields grid read-only', async () => {
    mockGet.mockResolvedValueOnce(makeScore())
    const wrapper = mount(ScoreShowView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(1)
    expect(mockGetFieldsConfig).toHaveBeenCalledOnce()
    const fieldsComponent = wrapper.findComponent(ScoreFieldsComponent)
    expect(fieldsComponent.props('readonly')).toBe(true)
    expect(fieldsComponent.props('modelValue')).toEqual({ werk: 'Requiem', kasten: 'A' })
  })

  it('links "bearbeiten" to the edit route and "Zur Suche" to the search route', async () => {
    mockGet.mockResolvedValueOnce(makeScore({ id: 5 }))
    const wrapper = mount(ScoreShowView, { props: { id: '5' } })
    await flushPromises()

    const links = wrapper.findAllComponents(RouterLinkStub)
    const editLink = links.find((link) => link.text() === 'bearbeiten')
    expect(editLink?.props('to')).toEqual({
      name: 'repertoire-scores-edit',
      params: { id: '5' },
    })
    const searchLink = links.find((link) => link.text() === 'Zur Suche')
    expect(searchLink?.props('to')).toEqual({ name: 'repertoire-scores-search' })
  })

  it('does not render the fields grid before the data has loaded', () => {
    mockGet.mockReturnValueOnce(new Promise(() => {}))
    const wrapper = mount(ScoreShowView, { props: { id: '1' } })

    expect(wrapper.findComponent(ScoreFieldsComponent).exists()).toBe(false)
  })
})
