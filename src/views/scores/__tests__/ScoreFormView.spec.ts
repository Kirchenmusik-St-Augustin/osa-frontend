import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import ScoreFormView from '../ScoreFormView.vue'
import ScoreFieldsComponent from '@/components/scores/ScoreFieldsComponent.vue'
import type { Score } from '@/composables/useScores'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockGetFieldsConfig = vi.fn()
const mockGetDefaults = vi.fn()
const mockGet = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/composables/useScores', () => ({
  useScores: () => ({
    getFieldsConfig: mockGetFieldsConfig,
    getDefaults: mockGetDefaults,
    get: mockGet,
    create: mockCreate,
    update: mockUpdate,
  }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
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

describe('ScoreFormView', () => {
  it('loads defaults (not an existing score) when creating', async () => {
    mockGetDefaults.mockResolvedValueOnce({ werk: '', kasten: '' })
    const wrapper = mount(ScoreFormView)
    await flushPromises()

    expect(mockGetDefaults).toHaveBeenCalledOnce()
    expect(mockGet).not.toHaveBeenCalled()
    expect(wrapper.findComponent(ScoreFieldsComponent).props('modelValue')).toEqual({
      werk: '',
      kasten: '',
    })
  })

  it('loads the existing score (not defaults) when editing', async () => {
    mockGet.mockResolvedValueOnce(makeScore())
    const wrapper = mount(ScoreFormView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(1)
    expect(mockGetDefaults).not.toHaveBeenCalled()
    expect(wrapper.findComponent(ScoreFieldsComponent).props('modelValue')).toEqual({
      werk: 'Requiem',
      kasten: 'A',
    })
  })

  it('asks "Wirklich speichern?" before submitting, and does nothing when cancelled', async () => {
    mockGetDefaults.mockResolvedValueOnce({ werk: '' })
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(ScoreFormView)
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockConfirmAction).toHaveBeenCalledWith('Wirklich speichern?')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates the score, toasts, and navigates to its show page on success', async () => {
    mockGetDefaults.mockResolvedValueOnce({ werk: 'Requiem' })
    mockConfirmAction.mockResolvedValueOnce(true)
    mockCreate.mockResolvedValueOnce(makeScore({ id: 9 }))
    const wrapper = mount(ScoreFormView)
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockCreate).toHaveBeenCalledWith({ werk: 'Requiem' })
    expect(mockShowToast).toHaveBeenCalledWith('gespeichert.')
    expect(mockPush).toHaveBeenCalledWith({
      name: 'repertoire-scores-show',
      params: { id: 9 },
    })
  })

  it('updates the score when editing', async () => {
    mockGet.mockResolvedValueOnce(makeScore({ id: 3 }))
    mockConfirmAction.mockResolvedValueOnce(true)
    mockUpdate.mockResolvedValueOnce(makeScore({ id: 3 }))
    const wrapper = mount(ScoreFormView, { props: { id: '3' } })
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith(3, { werk: 'Requiem', kasten: 'A' })
  })

  it('shows field errors and a generic toast when saving fails', async () => {
    mockGetDefaults.mockResolvedValueOnce({ werk: '' })
    mockConfirmAction.mockResolvedValueOnce(true)
    mockCreate.mockRejectedValueOnce({
      response: {
        data: {
          detail: [
            {
              loc: ['body', 'werk'],
              msg: 'Name, Komponist und Werkteil müssen zusammen eindeutig sein',
            },
          ],
        },
      },
    })
    const wrapper = mount(ScoreFormView)
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein Fehler ist aufgetreten.', true)
    expect(wrapper.findComponent(ScoreFieldsComponent).props('errors')).toEqual({
      werk: 'Name, Komponist und Werkteil müssen zusammen eindeutig sein',
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('links "zurück" to the show page when editing, and to search when creating', async () => {
    mockGetDefaults.mockResolvedValueOnce({ werk: '' })
    const createWrapper = mount(ScoreFormView)
    await flushPromises()
    const createBackLink = createWrapper.findComponent(RouterLinkStub)
    expect(createBackLink.props('to')).toEqual({ name: 'repertoire-scores-search' })

    mockGet.mockResolvedValueOnce(makeScore({ id: 4 }))
    const editWrapper = mount(ScoreFormView, { props: { id: '4' } })
    await flushPromises()
    const editBackLink = editWrapper.findComponent(RouterLinkStub)
    expect(editBackLink.props('to')).toEqual({
      name: 'repertoire-scores-show',
      params: { id: '4' },
    })
  })
})
