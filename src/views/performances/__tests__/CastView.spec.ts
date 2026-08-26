import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import CastView from '../CastView.vue'
import SingleCastList from '@/components/bookings/SingleCastList.vue'
import type { PerformanceCastPage } from '@/composables/useBookings'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

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
    // Legacy's expanded panel uses v-show, not v-if (see CastItem.vue
    // docstring) -- it stays mounted while collapsed, just hidden, so
    // "collapsed by default" must be asserted via isVisible(), not via
    // wrapper.text() (which doesn't respect display:none). isVisible()
    // itself only computes correctly for elements attached to a real
    // document, hence attachTo here.
    const wrapper = mount(CastView, { props: { id: '1' }, attachTo: document.body })
    await flushPromises()

    expect(mockGetCastPage).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Fagott')
    const castEntry = wrapper
      .findAll('small')
      .find((small) => small.text().includes('HUBER, Franz'))
    expect(castEntry?.isVisible()).toBe(false)
    // Legacy's Cast/Show.pug table renders "Name"/"gebucht" column headers
    // above each position-type's list (verified via Playwright against
    // osa.dev.schimpl.cc/content/music/performances/758/cast) -- kept as a
    // header row here rather than a literal HTML table (see
    // CastView.vue's docstring).
    expect(wrapper.text()).toContain('Name')
    expect(wrapper.text()).toContain('gebucht')
    // ...but only for types that actually have items -- Legacy omits the
    // whole table (no header either) for an empty Stimmen/Choraufgaben
    // section, a regression caught during that same Playwright check.
    expect(wrapper.findAll('span').filter((span) => span.text() === 'gebucht')).toHaveLength(1)
    wrapper.unmount()
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

  it('only visually hides the top-level reset link, keeping its line height reserved', async () => {
    // Legacy's Cast.vue reserves the row via a permanent &nbsp; and only
    // toggles the link text itself, so the page doesn't jump when the link
    // appears/disappears -- ported here via Bootstrap's `.invisible`
    // (visibility:hidden, space kept) instead of v-if (would collapse the row).
    mockGetCastPage.mockResolvedValueOnce(makePage())
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.find('.text-center.mb-3.c-pointer').classes()).toContain('invisible')

    await wrapper.find('.c-pointer').trigger('click') // expand Fagott
    await wrapper.find('.fa-times').trigger('click') // remove HUBER, Franz

    expect(wrapper.find('.text-center.mb-3.c-pointer').classes()).not.toContain('invisible')
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

  it('centers the Instrumente/Stimmen/Choraufgaben subtitles like Legacy’s PageSubtitleComponent', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    const subtitle = wrapper.findAll('.h4').find((el) => el.text() === 'Instrumente')
    expect(subtitle?.classes()).toContain('text-center')
  })

  it('saves a payload stripped of display-only name fields, then navigates to the calendar month of the performance', async () => {
    // Legacy's PerformanceController::saveCast() redirects to
    // `content.music.performances.index` (the calendar) for the
    // performance's own schedule year/month, verified live against
    // osa.dev.schimpl.cc/content/music/performances/731/cast -- Cast does
    // NOT stay on the same page showing a refreshed snapshot.
    mockGetCastPage.mockResolvedValueOnce(makePage())
    mockSaveCast.mockResolvedValueOnce({
      cast: { instruments: [{ id: 10, name: 'Fagott', cast: [] }], voices: [], choirjobs: [] },
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
    expect(mockPush).toHaveBeenCalledWith({ name: 'home', query: { year: 2026, month: 8 } })
  })

  it('the "zurück" link goes to the calendar month of the performance, not its show page', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.findComponent(RouterLinkStub).props('to')).toEqual({
      name: 'home',
      query: { year: 2026, month: 8 },
    })
  })

  it('adds a rejected candidate to the shared not_booked list', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('.c-pointer').trigger('click') // expand the Fagott item
    // The MultiSelectDropdown toggle badge -- distinguish it from other
    // .c-pointer elements (SingleCastList's remove/reorder icons) via its
    // distinctive class combo instead of a fragile DOM-order index.
    await wrapper.find('.border.rounded.m-1.c-pointer.bg-white').trigger('click')
    // "list-group-item" also matches CastItem's own accordion row --
    // list-group-item-action is unique to the candidate rows.
    await wrapper.find('.list-group-item-action').trigger('click') // select NEU, Kandidat
    const rejectButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'zurückweisen')
    await rejectButton?.trigger('click')

    expect(wrapper.text()).toContain('nicht gebucht')
    expect(wrapper.text()).toContain('NEU, Kandidat')
  })

  it('passes the same not_booked list to every position so each shows it in its own box, not once at the page bottom', async () => {
    // Verified live against osa.dev.schimpl.cc/content/music/performances/731/cast
    // (Legacy): the "nicht gebucht" list is performance-wide DATA, but
    // Legacy's CastItemComponent.vue passes the identical array into every
    // position's own SingleCastListComponent -- it shows up redundantly
    // under Violine 1 AND Violine 2 AND every other box, never as a single
    // section below the whole list. A prior port collapsed this into one
    // shared section under the page, which this regression-tests against.
    mockGetCastPage.mockResolvedValueOnce(
      makePage({
        setup: {
          instruments: [
            { id: 10, name: 'Fagott', quantity: 1 },
            { id: 11, name: 'Oboe', quantity: 1 },
          ],
          voices: [],
          choirjobs: [],
        },
        staff: {
          instruments: [
            { id: 10, name: 'Fagott', bookable: { requesting: [], other: [] } },
            { id: 11, name: 'Oboe', bookable: { requesting: [], other: [] } },
          ],
          voices: [],
          choirjobs: [],
        },
        form_data: {
          cast: {
            instruments: [
              { id: 10, name: 'Fagott', cast: [] },
              { id: 11, name: 'Oboe', cast: [] },
            ],
            voices: [],
            choirjobs: [],
          },
          not_booked: [{ id: 99, name: 'REJECTED, Kandidat' }],
        },
      }),
    )
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    const lists = wrapper.findAllComponents(SingleCastList)
    expect(lists).toHaveLength(2)
    for (const list of lists) {
      expect(list.props('notBooked')).toEqual([{ id: 99, name: 'REJECTED, Kandidat' }])
      expect(list.text()).toContain('REJECTED, Kandidat')
    }
  })
})
