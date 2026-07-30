import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CastView from '../CastView.vue'
import type { PerformanceCastPage } from '@/composables/useBookings'

const mockGetCastPage = vi.fn()
const mockSaveCast = vi.fn()
vi.mock('@/composables/useBookings', () => ({
  useBookings: () => ({ getCastPage: mockGetCastPage, saveCast: mockSaveCast }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ hasPermission: () => false }),
}))

function makePage(overrides: Partial<PerformanceCastPage> = {}): PerformanceCastPage {
  return {
    id: 1,
    ordinariumwork_name: 'Krönungsmesse',
    ordinariumwork_artist_name: 'MOZART, Wolfgang',
    artist_name: null,
    schedule: '2026-08-02T11:00:00',
    rehearsals: [],
    location: { id: 1, name: 'Augustinerkirche', color: '336699', address: null },
    demanding_proprium: false,
    setup: {
      instruments: [{ id: 10, name: 'Fagott', quantity: 1 }],
      voices: [],
      choirjobs: [],
    },
    staff: {
      instruments: [
        {
          id: 10,
          name: 'Fagott',
          bookable: { requesting: [], other: [{ id: 7, name: 'NEU, Kandidat' }] },
        },
      ],
      voices: [],
      choirjobs: [],
    },
    form_data: {
      cast: {
        instruments: [{ id: 10, name: 'Fagott', cast: [{ id: 5, name: 'HUBER, Franz', fee: 60 }] }],
        voices: [],
        choirjobs: [],
      },
      not_booked: [],
    },
    fees: [
      { id: 1, name: 'Chor', amount: 0 },
      { id: 3, name: 'Instrumentalist', amount: 60 },
    ],
    popular: { instruments: {}, voices: {}, choirjobs: {} },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockConfirmAction.mockResolvedValue(true)
})

describe('CastView', () => {
  it('fetches and renders the setup items, collapsed by default', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGetCastPage).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Fagott')
    expect(wrapper.text()).not.toContain('HUBER, Franz')
    // Legacy's Cast/Show.pug table renders "Name"/"gebucht" column headers
    // above each position-type's list (verified via Playwright against
    // osa.dev.schimpl.cc/content/music/performances/758/cast) -- kept as a
    // header row here rather than a literal HTML table (see
    // CastView.vue's docstring / project_osa_migration_plan memory).
    expect(wrapper.text()).toContain('Name')
    expect(wrapper.text()).toContain('gebucht')
    // ...but only for types that actually have items -- Legacy omits the
    // whole table (no header either) for an empty Stimmen/Choraufgaben
    // section, a regression caught during that same Playwright check.
    expect(wrapper.findAll('span').filter((span) => span.text() === 'gebucht')).toHaveLength(1)
  })

  it('disables save until the cast is actually changed, then enables it on a child emit', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    const findSave = () => wrapper.findAll('button').find((button) => button.text() === 'speichern')
    expect(findSave()?.attributes('disabled')).toBeDefined()

    await wrapper.find('.c-pointer').trigger('click') // expand the Fagott item
    await wrapper.find('.fa-times').trigger('click') // remove HUBER, Franz from the cast

    expect(wrapper.text()).not.toContain('HUBER, Franz')
    expect(findSave()?.attributes('disabled')).toBeUndefined()
  })

  it('resets to the last saved values via the reset link', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.find('.fa-times').trigger('click')
    expect(wrapper.text()).not.toContain('HUBER, Franz')

    const resetLink = wrapper
      .findAll('small')
      .find((small) => small.text() === 'alles auf derzeit gespeicherte Werte zurücksetzen')
    await resetLink?.trigger('click')

    expect(wrapper.text()).toContain('HUBER, Franz')
  })

  it('saves a payload stripped of display-only name fields and refreshes the snapshot', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    mockSaveCast.mockResolvedValueOnce({
      cast: {
        instruments: [
          { id: 10, name: 'Fagott', cast: [{ id: 7, name: 'NEU, Kandidat', fee: 60 }] },
        ],
        voices: [],
        choirjobs: [],
      },
      not_booked: [],
    })
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    const saveButton = wrapper.findAll('button').find((button) => button.text() === 'speichern')
    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.find('.fa-times').trigger('click')
    await saveButton?.trigger('click')
    await flushPromises()

    expect(mockSaveCast).toHaveBeenCalledWith(1, {
      cast: { instruments: [{ id: 10, cast: [] }], voices: [], choirjobs: [] },
      not_booked: [],
    })
    expect(mockShowToast).toHaveBeenCalledWith('gespeichert.')
    expect(wrapper.text()).toContain('NEU, Kandidat')
  })

  it('adds a checked candidate to the "nicht gebucht" list performance-wide, not per-position', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    const rejectButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'zurückweisen')
    await rejectButton?.trigger('click')

    expect(wrapper.text()).toContain('nicht gebucht')
    expect(wrapper.text()).toContain('NEU, Kandidat')
  })
})
