import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import OrdinariumworkFormView from '../OrdinariumworkFormView.vue'
import type { Ordinariumwork, OrdinariumworkSetup } from '@/composables/useOrdinariumworks'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockListComposers = vi.fn()
vi.mock('@/composables/useArtists', () => ({
  useArtists: () => ({ listComposers: mockListComposers }),
}))

const mockGet = vi.fn()
const mockGetSetup = vi.fn()
const mockGetAvailablePositions = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/composables/useOrdinariumworks', () => ({
  useOrdinariumworks: () => ({
    get: mockGet,
    getSetup: mockGetSetup,
    getAvailablePositions: mockGetAvailablePositions,
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

function makeWork(overrides: Partial<Ordinariumwork> = {}): Ordinariumwork {
  return {
    id: 1,
    name: 'Krönungsmesse',
    description: null,
    artist_id: 2,
    artist_name: 'MOZART, Wolfgang',
    duration: 25,
    demanding: false,
    ...overrides,
  }
}

function makeSetup(overrides: Partial<OrdinariumworkSetup> = {}): OrdinariumworkSetup {
  return { instruments: [], voices: [], ...overrides }
}

// The QuantityEditor's "hinzufügen" button also carries `.btn-primary`, so
// a plain class selector would match it instead of "speichern" -- select
// by text to unambiguously hit the actual save button.
function findSaveButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button').find((button) => button.text() === 'speichern')
}

beforeEach(() => {
  // resetAllMocks (not just clearAllMocks) also drops any queued
  // mockResolvedValueOnce/mockRejectedValueOnce implementations -- with
  // several chained async composable calls per test (listComposers,
  // getAvailablePositions, get, getSetup, create/update), clearAllMocks
  // alone left a stale queued once-value from an earlier test to be
  // consumed here instead of the one this test just configured.
  vi.resetAllMocks()
  mockConfirmAction.mockResolvedValue(true)
  mockListComposers.mockResolvedValue([{ id: 2, label: 'MOZART, Wolfgang' }])
  mockGetAvailablePositions.mockResolvedValue({
    instruments: [{ id: 10, name: 'Fagott' }],
    voices: [{ id: 20, name: 'Sopran' }],
  })
})

describe('OrdinariumworkFormView', () => {
  it('does not fetch an existing work when creating', async () => {
    mockCreate.mockResolvedValueOnce(makeWork({ id: 9 }))
    const wrapper = mount(OrdinariumworkFormView, { props: {} })
    await flushPromises()

    expect(mockGet).not.toHaveBeenCalled()
    expect(mockListComposers).toHaveBeenCalled()
    expect(mockGetAvailablePositions).toHaveBeenCalled()
    expect(wrapper.find('input#ordinariumwork-name').exists()).toBe(true)
  })

  it('creates a new work and strips the name field from setup positions', async () => {
    mockCreate.mockResolvedValueOnce(makeWork({ id: 9 }))
    const wrapper = mount(OrdinariumworkFormView, { props: {} })
    await flushPromises()

    await wrapper.find('input#ordinariumwork-name').setValue('Requiem')
    await wrapper.find('select#ordinariumwork-artist').setValue('2')
    await wrapper.find('textarea#ordinariumwork-description').setValue('Unvollendet')
    await wrapper.find('input#ordinariumwork-duration').setValue('30')
    await wrapper.find('input#ordinariumwork-demanding').setValue(true)
    const addButtons = wrapper.findAll('button').filter((button) => button.text() === 'hinzufügen')
    await addButtons[0]?.trigger('click')
    await addButtons[1]?.trigger('click')
    await findSaveButton(wrapper)?.trigger('click')
    await flushPromises()

    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Requiem',
      description: 'Unvollendet',
      artist_id: 2,
      duration: 30,
      demanding: true,
      setup: {
        instruments: [{ id: 10, quantity: 1 }],
        voices: [{ id: 20, quantity: 1 }],
      },
    })
    expect(mockShowToast).toHaveBeenCalledWith('gespeichert.')
    expect(mockPush).toHaveBeenCalledWith({
      name: 'repertoire-ordinariumworks-show',
      params: { id: 9 },
    })
  })

  it('pre-fills the form and its setup editors when editing', async () => {
    mockGet.mockResolvedValueOnce(makeWork())
    mockGetSetup.mockResolvedValueOnce(
      makeSetup({ instruments: [{ id: 10, name: 'Fagott', quantity: 3 }] }),
    )
    mockUpdate.mockResolvedValueOnce(makeWork())
    const wrapper = mount(OrdinariumworkFormView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(1)
    expect(mockGetSetup).toHaveBeenCalledWith(1)
    expect((wrapper.find('input#ordinariumwork-name').element as HTMLInputElement).value).toBe(
      'Krönungsmesse',
    )
    expect(wrapper.text()).toContain('Fagott')

    await findSaveButton(wrapper)?.trigger('click')
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        setup: { instruments: [{ id: 10, quantity: 3 }], voices: [] },
      }),
    )
  })

  it('shows the setup validation error under the setup section', async () => {
    mockCreate.mockRejectedValueOnce({
      response: {
        data: { detail: [{ loc: ['body', 'setup'], msg: 'instruments: Element nicht gefunden.' }] },
      },
    })
    const wrapper = mount(OrdinariumworkFormView, { props: {} })
    await flushPromises()

    await findSaveButton(wrapper)?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('instruments: Element nicht gefunden.')
  })
})
