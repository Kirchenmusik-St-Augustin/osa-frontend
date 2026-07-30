import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PerformanceFormView from '../PerformanceFormView.vue'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'
import type {
  PerformanceAvailableData,
  PerformanceFormData,
  PerformanceResponse,
} from '@/composables/usePerformances'
import type { Ordinariumwork, OrdinariumworkSetup } from '@/composables/useOrdinariumworks'
import type { Propriumwork } from '@/composables/usePropriumworks'

const { MockModal, mockModalShow, mockModalHide } = vi.hoisted(() => {
  const mockModalShow = vi.fn()
  const mockModalHide = vi.fn()
  class MockModal {
    show = mockModalShow
    hide = mockModalHide
  }
  return { MockModal, mockModalShow, mockModalHide }
})
vi.mock('bootstrap', () => ({ Modal: MockModal }))

const mockPush = vi.fn().mockResolvedValue(undefined)
let mockQuery: Record<string, string> = {}
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ query: mockQuery }),
}))

const mockGetAvailableData = vi.fn()
const mockGetFormData = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockRemove = vi.fn()
vi.mock('@/composables/usePerformances', () => ({
  usePerformances: () => ({
    getAvailableData: mockGetAvailableData,
    getFormData: mockGetFormData,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
  }),
}))

const mockSearchOrdinariumworks = vi.fn()
const mockGetOrdinariumwork = vi.fn()
const mockGetSetup = vi.fn()
vi.mock('@/composables/useOrdinariumworks', () => ({
  useOrdinariumworks: () => ({
    search: mockSearchOrdinariumworks,
    get: mockGetOrdinariumwork,
    getSetup: mockGetSetup,
  }),
}))

const mockSearchPropriumworks = vi.fn()
const mockGetPropriumwork = vi.fn()
vi.mock('@/composables/usePropriumworks', () => ({
  usePropriumworks: () => ({
    search: mockSearchPropriumworks,
    get: mockGetPropriumwork,
  }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

function makeAvailable(
  overrides: Partial<PerformanceAvailableData> = {},
): PerformanceAvailableData {
  return {
    conductors: [{ id: 9, name: 'ORTNER, Erwin' }],
    instruments: [{ id: 10, name: 'Fagott' }],
    voices: [{ id: 20, name: 'Sopran' }],
    choirjobs: [{ id: 30, name: 'Kantor' }],
    locations: [{ id: 1, name: 'Augustinerkirche', color: '336699', address: null }],
    propriumelements: [{ id: 40, name: 'Introitus' }],
    ...overrides,
  }
}

function makeFormData(overrides: Partial<PerformanceFormData> = {}): PerformanceFormData {
  return {
    id: 1,
    schedule: '2026-08-02T11:00:00',
    location_id: 1,
    ordinariumwork_id: 5,
    ordinariumwork_label: 'MOZART, Wolfgang: Krönungsmesse',
    artist_id: null,
    description: null,
    choirjob_defaultfee: 35,
    instrument_defaultfee: 60,
    voice_defaultfee: 110,
    extracost_amount: null,
    extracost_description: null,
    setup: { instruments: [], voices: [], choirjobs: [] },
    proprium: [],
    rehearsals: [],
    deletable: true,
    ...overrides,
  }
}

function findSaveButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button').find((button) => button.text() === 'speichern')
}

function findDeleteButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button').find((button) => button.text() === 'löschen')
}

beforeEach(() => {
  vi.resetAllMocks()
  mockQuery = { year: '2026', month: '8' }
  mockConfirmAction.mockResolvedValue(true)
  mockGetAvailableData.mockResolvedValue(makeAvailable())
})

describe('PerformanceFormView -- create mode', () => {
  it('does not fetch form data and disables saving until an Ordinarium is chosen', async () => {
    const wrapper = mount(PerformanceFormView, { props: {} })
    await flushPromises()

    expect(mockGetFormData).not.toHaveBeenCalled()
    expect(findSaveButton(wrapper)?.attributes('disabled')).toBeDefined()
  })

  it('never shows a delete button when creating', async () => {
    const wrapper = mount(PerformanceFormView, { props: {} })
    await flushPromises()

    expect(findDeleteButton(wrapper)).toBeUndefined()
  })

  it('selecting an Ordinariumwork fills the label and instrument/voice setup, leaving choirjobs untouched', async () => {
    const work: Ordinariumwork = {
      id: 5,
      name: 'Krönungsmesse',
      description: null,
      artist_id: 2,
      artist_name: 'MOZART, Wolfgang',
      duration: 25,
      demanding: false,
    }
    const setup: OrdinariumworkSetup = {
      instruments: [{ id: 10, name: 'Fagott', quantity: 2 }],
      voices: [{ id: 20, name: 'Sopran', quantity: 4 }],
    }
    mockGetOrdinariumwork.mockResolvedValueOnce(work)
    mockGetSetup.mockResolvedValueOnce(setup)
    const wrapper = mount(PerformanceFormView, { props: {} })
    await flushPromises()

    await wrapper.findComponent(SearchTypeahead).vm.$emit('select', 5)
    await flushPromises()

    expect(mockGetOrdinariumwork).toHaveBeenCalledWith(5)
    expect(mockGetSetup).toHaveBeenCalledWith(5)
    expect(wrapper.text()).toContain('MOZART, Wolfgang: Krönungsmesse')
    expect(findSaveButton(wrapper)?.attributes('disabled')).toBeUndefined()
    // Regression guard: the modal instance must actually be wired to the
    // template ref (a naming collision between the plain Modal-instance
    // variable and the ref name silently broke this once already).
    expect(mockModalHide).toHaveBeenCalled()
  })

  it("creates a performance and navigates to the saved schedule's calendar month", async () => {
    mockGetOrdinariumwork.mockResolvedValueOnce({
      id: 5,
      name: 'Krönungsmesse',
      description: null,
      artist_id: 2,
      artist_name: 'MOZART, Wolfgang',
      duration: 25,
      demanding: false,
    })
    mockGetSetup.mockResolvedValueOnce({ instruments: [], voices: [] })
    mockCreate.mockResolvedValueOnce({
      id: 99,
      schedule: '2026-09-06T11:00:00',
    } as PerformanceResponse)
    const wrapper = mount(PerformanceFormView, { props: {} })
    await flushPromises()
    await wrapper.findComponent(SearchTypeahead).vm.$emit('select', 5)
    await flushPromises()

    await wrapper.find('select#performance-location').setValue('1')
    await findSaveButton(wrapper)?.trigger('click')
    await flushPromises()

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ location_id: 1, ordinariumwork_id: 5 }),
    )
    expect(mockShowToast).toHaveBeenCalledWith('gespeichert.')
    expect(mockPush).toHaveBeenCalledWith({ name: 'home', query: { year: 2026, month: 9 } })
  })

  it('shows a field-level validation error returned by the backend', async () => {
    mockGetOrdinariumwork.mockResolvedValueOnce({
      id: 5,
      name: 'Krönungsmesse',
      description: null,
      artist_id: 2,
      artist_name: 'MOZART, Wolfgang',
      duration: 25,
      demanding: false,
    })
    mockGetSetup.mockResolvedValueOnce({ instruments: [], voices: [] })
    mockCreate.mockRejectedValueOnce({
      response: {
        data: {
          detail: [{ loc: ['body', 'location_id'], msg: 'Ort wurde nicht gefunden.' }],
        },
      },
    })
    const wrapper = mount(PerformanceFormView, { props: {} })
    await flushPromises()
    await wrapper.findComponent(SearchTypeahead).vm.$emit('select', 5)
    await flushPromises()

    await findSaveButton(wrapper)?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Ort wurde nicht gefunden.')
  })
})

describe('PerformanceFormView -- edit mode', () => {
  it('fetches and pre-fills the existing performance', async () => {
    mockGetFormData.mockResolvedValueOnce(makeFormData())
    const wrapper = mount(PerformanceFormView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGetFormData).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('MOZART, Wolfgang: Krönungsmesse')
  })

  it('enables the delete button when deletable and calls remove on confirm', async () => {
    mockGetFormData.mockResolvedValueOnce(makeFormData({ deletable: true }))
    mockRemove.mockResolvedValueOnce(undefined)
    const wrapper = mount(PerformanceFormView, { props: { id: '1' } })
    await flushPromises()

    const deleteButton = findDeleteButton(wrapper)
    expect(deleteButton?.attributes('disabled')).toBeUndefined()

    await deleteButton?.trigger('click')
    await flushPromises()

    expect(mockRemove).toHaveBeenCalledWith(1)
    expect(mockShowToast).toHaveBeenCalledWith('gelöscht.')
    expect(mockPush).toHaveBeenCalledWith({ name: 'home', query: { year: 2026, month: 8 } })
  })

  it('disables the delete button when not deletable', async () => {
    mockGetFormData.mockResolvedValueOnce(makeFormData({ deletable: false }))
    const wrapper = mount(PerformanceFormView, { props: { id: '1' } })
    await flushPromises()

    expect(findDeleteButton(wrapper)?.attributes('disabled')).toBeDefined()
  })

  it('updates via the id-scoped endpoint on save', async () => {
    mockGetFormData.mockResolvedValueOnce(makeFormData())
    mockUpdate.mockResolvedValueOnce({ id: 1, schedule: '2026-08-02T11:00:00' })
    const wrapper = mount(PerformanceFormView, { props: { id: '1' } })
    await flushPromises()

    await findSaveButton(wrapper)?.trigger('click')
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ location_id: 1 }))
  })
})

describe('PerformanceFormView -- Proprium editor', () => {
  it('adds a Proprium entry ordered by the propriumelements canon, then removes it', async () => {
    mockGetFormData.mockResolvedValueOnce(makeFormData())
    const propriumwork: Propriumwork = {
      id: 7,
      name: 'Gregorianik I',
      description: 'Feierlich',
      artist_id: 3,
      artist_name: 'HAYDN, Joseph',
      duration: null,
      demanding: false,
    }
    mockGetPropriumwork.mockResolvedValueOnce(propriumwork)
    const wrapper = mount(PerformanceFormView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('.fa-plus-circle').trigger('click')
    expect(mockModalShow).toHaveBeenCalled()
    // Two modals each embed their own SearchTypeahead (Ordinarium + Proprium)
    // -- scope to #propriumModal so this doesn't accidentally hit the other.
    await wrapper.find('#propriumModal').findComponent(SearchTypeahead).vm.$emit('select', 7)
    await flushPromises()
    const addButton = wrapper.findAll('button').find((button) => button.text() === 'Hinzufügen')
    await addButton?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Gregorianik I')
    expect(wrapper.text()).toContain('Introitus')
    expect(mockModalHide).toHaveBeenCalled()

    await wrapper.find('.fa-trash').trigger('click')
    expect(wrapper.text()).not.toContain('Gregorianik I')
  })
})
