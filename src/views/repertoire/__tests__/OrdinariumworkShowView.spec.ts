import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import OrdinariumworkShowView from '../OrdinariumworkShowView.vue'
import type { Ordinariumwork, OrdinariumworkSetup } from '@/composables/useOrdinariumworks'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockGet = vi.fn()
const mockGetSetup = vi.fn()
const mockRemove = vi.fn()
vi.mock('@/composables/useOrdinariumworks', () => ({
  useOrdinariumworks: () => ({ get: mockGet, getSetup: mockGetSetup, remove: mockRemove }),
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
    duration: null,
    demanding: false,
    ...overrides,
  }
}

function makeSetup(overrides: Partial<OrdinariumworkSetup> = {}): OrdinariumworkSetup {
  return { instruments: [], voices: [], ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OrdinariumworkShowView', () => {
  it('loads work and setup, rendering name/composer and conditional fields', async () => {
    mockGet.mockResolvedValueOnce(makeWork({ duration: 25 }))
    mockGetSetup.mockResolvedValueOnce(makeSetup())
    const wrapper = mount(OrdinariumworkShowView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(1)
    expect(mockGetSetup).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Krönungsmesse')
    expect(wrapper.text()).toContain('MOZART, Wolfgang')
    expect(wrapper.text()).toContain('25 Minuten')
    expect(wrapper.text()).not.toContain('Beschreibung')
  })

  it('shows "anspruchsvoll" in red text when demanding', async () => {
    mockGet.mockResolvedValueOnce(makeWork({ demanding: true }))
    mockGetSetup.mockResolvedValueOnce(makeSetup())
    const wrapper = mount(OrdinariumworkShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.find('.text-danger').text()).toBe('anspruchsvoll')
  })

  it('renders the instruments/voices setup tables only when non-empty', async () => {
    mockGet.mockResolvedValueOnce(makeWork())
    mockGetSetup.mockResolvedValueOnce(
      makeSetup({ instruments: [{ id: 1, name: 'Fagott', quantity: 2 }] }),
    )
    const wrapper = mount(OrdinariumworkShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Instrumente')
    expect(wrapper.text()).toContain('Fagott')
    expect(wrapper.text()).not.toContain('Stimmen')
  })

  it('deletes after confirmation with the calendar-specific in-use message', async () => {
    mockGet.mockResolvedValueOnce(makeWork())
    mockGetSetup.mockResolvedValueOnce(makeSetup())
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockRejectedValueOnce(new Error('blocked'))
    const wrapper = mount(OrdinariumworkShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('button.btn-danger').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(
      'Die Ordinarium-Komposition kann nicht gelöscht werden, da sie im Kalender verwendet wird.',
      true,
    )
  })

  it('navigates back to search after a successful delete', async () => {
    mockGet.mockResolvedValueOnce(makeWork())
    mockGetSetup.mockResolvedValueOnce(makeSetup())
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockResolvedValueOnce(undefined)
    const wrapper = mount(OrdinariumworkShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('button.btn-danger').trigger('click')
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({ name: 'repertoire-ordinariumworks-search' })
  })
})
