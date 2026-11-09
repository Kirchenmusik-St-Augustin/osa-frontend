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
    id: '1',
    ordinariumwork_name: 'Krönungsmesse',
    ordinariumwork_artist_name: 'MOZART, Wolfgang',
    artist_name: null,
    schedule: '2026-08-02T11:00:00',
    rehearsals: [],
    location: { id: '1', name: 'Augustinerkirche', color: '336699', address: null },
    demanding_proprium: false,
    setup: {
      instruments: [{ id: '10', name: 'Fagott', quantity: 1, active: true }],
      voices: [],
      choirjobs: [],
    },
    staff: {
      instruments: [
        {
          id: '10',
          name: 'Fagott',
          bookable: { requesting: [], other: [{ id: '7', name: 'NEU, Kandidat' }] },
        },
      ],
      voices: [],
      choirjobs: [],
    },
    form_data: {
      cast: {
        instruments: [
          { id: '10', name: 'Fagott', cast: [{ id: '5', name: 'HUBER, Franz', fee: 60 }] },
        ],
        voices: [],
        choirjobs: [],
      },
      not_booked: [],
    },
    fees: [
      { id: '1', name: 'Chor', amount: 0 },
      { id: '3', name: 'Instrumentalist', amount: 60 },
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
    // The expanded panel uses v-show, not v-if (see CastItem.vue
    // docstring) -- it stays mounted while collapsed, just hidden, so
    // "collapsed by default" must be asserted via isVisible(), not via
    // wrapper.text() (which doesn't respect display:none). isVisible()
    // itself only computes correctly for elements attached to a real
    // document, hence attachTo here.
    const wrapper = mount(CastView, { props: { id: '1' }, attachTo: document.body })
    await flushPromises()

    expect(mockGetCastPage).toHaveBeenCalledWith('1')
    expect(wrapper.text()).toContain('Fagott')
    const castEntry = wrapper
      .findAll('small')
      .find((small) => small.text().includes('HUBER, Franz'))
    expect(castEntry?.isVisible()).toBe(false)
    // "Name"/"gebucht" column headers above each position-type's list --
    // kept as a header row rather than a literal HTML table (see
    // CastView.vue's docstring).
    expect(wrapper.text()).toContain('Name')
    expect(wrapper.text()).toContain('gebucht')
    // ...but only for types that actually have items -- an empty
    // Stimmen/Choraufgaben section gets no header either.
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
    // The row is reserved and only the link text is toggled, so the page
    // doesn't jump when the link appears/disappears -- via Bootstrap's
    // `.invisible` (visibility:hidden, space kept) instead of v-if (would
    // collapse the row).
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

  it('tells the disponent when the cast page cannot be loaded', async () => {
    mockGetCastPage.mockRejectedValueOnce({ response: { data: { detail: 'Keine Berechtigung.' } } })
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Keine Berechtigung.', true)
    expect(wrapper.text()).not.toContain('Fagott')
  })

  it('shows the server reason when saving is rejected and keeps the page', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    mockSaveCast.mockRejectedValueOnce({
      response: {
        data: { detail: [{ loc: ['body', 'general'], msg: 'Der Benutzer ist nicht buchbar.' }] },
      },
    })
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()
    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.find('.fa-times').trigger('click')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'speichern')
      ?.trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Der Benutzer ist nicht buchbar.', true)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('sends one save while the request is in flight', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    let finishSave: (value: unknown) => void = () => {}
    mockSaveCast.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSave = resolve
      }),
    )
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()
    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.find('.fa-times').trigger('click')
    const save = () => wrapper.findAll('button').find((button) => button.text() === 'speichern')

    await save()?.trigger('click')
    await flushPromises()

    expect(save()?.attributes('disabled')).toBeDefined()
    await save()?.trigger('click')
    await flushPromises()
    expect(mockSaveCast).toHaveBeenCalledOnce()
    finishSave({})
    await flushPromises()
  })

  it('ignores a second save call while the first request is still running', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    let finishSave: (value: unknown) => void = () => {}
    mockSaveCast.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSave = resolve
      }),
    )
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()
    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.find('.fa-times').trigger('click')
    const { save } = wrapper.vm as unknown as { save: () => Promise<void> }

    const first = save()
    await flushPromises()
    await save()

    expect(mockSaveCast).toHaveBeenCalledOnce()
    finishSave({})
    await first
  })

  it('centers the Instrumente/Stimmen/Choraufgaben subtitles', async () => {
    mockGetCastPage.mockResolvedValueOnce(makePage())
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    const subtitle = wrapper.findAll('.h4').find((el) => el.text() === 'Instrumente')
    expect(subtitle?.classes()).toContain('text-center')
  })

  it('saves a payload stripped of display-only name fields, then navigates to the calendar month of the performance', async () => {
    // Saving redirects to the calendar for the performance's own schedule
    // year/month -- Cast does NOT stay on the same page showing a refreshed
    // snapshot.
    mockGetCastPage.mockResolvedValueOnce(makePage())
    mockSaveCast.mockResolvedValueOnce({
      cast: { instruments: [{ id: '10', name: 'Fagott', cast: [] }], voices: [], choirjobs: [] },
      not_booked: [],
    })
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    const saveButton = wrapper.findAll('button').find((button) => button.text() === 'speichern')
    await wrapper.find('.c-pointer').trigger('click')
    await wrapper.find('.fa-times').trigger('click')
    await saveButton?.trigger('click')
    await flushPromises()

    expect(mockSaveCast).toHaveBeenCalledWith('1', {
      cast: { instruments: [{ id: '10', cast: [] }], voices: [], choirjobs: [] },
      not_booked: [],
    })
    expect(mockShowToast).toHaveBeenCalledWith('gespeichert.')
    expect(mockPush).toHaveBeenCalledWith({ name: 'home', query: { year: 2026, month: 8 } })
  })

  function makeFullPage(): PerformanceCastPage {
    return makePage({
      setup: {
        instruments: [{ id: '10', name: 'Fagott', quantity: 1, active: true }],
        voices: [{ id: '20', name: 'Sopran', quantity: 2, active: true }],
        choirjobs: [{ id: '30', name: 'Solo', quantity: 1, active: true }],
      },
      staff: {
        instruments: [{ id: '10', name: 'Fagott', bookable: { requesting: [], other: [] } }],
        voices: [{ id: '20', name: 'Sopran', bookable: { requesting: [], other: [] } }],
        choirjobs: [{ id: '30', name: 'Solo', bookable: { requesting: [], other: [] } }],
      },
      form_data: {
        cast: {
          instruments: [
            {
              id: '10',
              name: 'Fagott',
              cast: [
                { id: '5', name: 'HUBER, Franz', fee: 60 },
                { id: '4', name: 'AUER, Alfred', fee: 65 },
              ],
            },
          ],
          voices: [
            {
              id: '20',
              name: 'Sopran',
              cast: [
                { id: '6', name: 'ADLER, Anna', fee: 30 },
                { id: '8', name: 'BERG, Berta', fee: 35 },
              ],
            },
          ],
          choirjobs: [
            { id: '30', name: 'Solo', cast: [{ id: '9', name: 'CZERNY, Carl', fee: 40 }] },
          ],
        },
        not_booked: [
          { id: '99', name: 'ZURÜCK, Zita' },
          { id: '98', name: 'ABGELEHNT, Alois' },
        ],
      },
    })
  }

  it('saves every position type with ids and fees and the not_booked ids only', async () => {
    mockGetCastPage.mockResolvedValueOnce(makeFullPage())
    mockSaveCast.mockResolvedValueOnce(undefined)
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('.c-pointer').trigger('click') // expand the Fagott item
    await wrapper.find('.fa-times').trigger('click') // remove HUBER, Franz
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'speichern')
      ?.trigger('click')
    await flushPromises()

    expect(mockSaveCast).toHaveBeenCalledWith('1', {
      cast: {
        instruments: [{ id: '10', cast: [{ id: '4', fee: 65 }] }],
        voices: [
          {
            id: '20',
            cast: [
              { id: '6', fee: 30 },
              { id: '8', fee: 35 },
            ],
          },
        ],
        choirjobs: [{ id: '30', cast: [{ id: '9', fee: 40 }] }],
      },
      not_booked: [{ id: '99' }, { id: '98' }],
    })
  })

  it('removes one entry from the not_booked list and saves the rest', async () => {
    mockGetCastPage.mockResolvedValueOnce(makeFullPage())
    mockSaveCast.mockResolvedValueOnce(undefined)
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()
    const saveButton = () =>
      wrapper.findAll('button').find((button) => button.text() === 'speichern')
    expect(saveButton()?.attributes('disabled')).toBeDefined()

    await wrapper.find('.c-pointer').trigger('click') // expand the Fagott item
    const removeZita = wrapper
      .findAll('small.text-danger')
      .find((small) => small.text().includes('ZURÜCK, Zita'))
      ?.find('button')
    await removeZita?.trigger('click')

    expect(saveButton()?.attributes('disabled')).toBeUndefined()
    await saveButton()?.trigger('click')
    await flushPromises()
    expect(mockSaveCast.mock.calls[0]?.[1].not_booked).toEqual([{ id: '98' }])
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
    // The "nicht gebucht" list is performance-wide DATA, but the identical
    // array is passed into every position's own SingleCastList -- it shows up
    // redundantly under Violine 1 AND Violine 2 AND every other box, never as
    // a single section below the whole list. A prior implementation collapsed
    // this into one shared section under the page, which this
    // regression-tests against.
    mockGetCastPage.mockResolvedValueOnce(
      makePage({
        setup: {
          instruments: [
            { id: '10', name: 'Fagott', quantity: 1, active: true },
            { id: '11', name: 'Oboe', quantity: 1, active: true },
          ],
          voices: [],
          choirjobs: [],
        },
        staff: {
          instruments: [
            { id: '10', name: 'Fagott', bookable: { requesting: [], other: [] } },
            { id: '11', name: 'Oboe', bookable: { requesting: [], other: [] } },
          ],
          voices: [],
          choirjobs: [],
        },
        form_data: {
          cast: {
            instruments: [
              { id: '10', name: 'Fagott', cast: [] },
              { id: '11', name: 'Oboe', cast: [] },
            ],
            voices: [],
            choirjobs: [],
          },
          not_booked: [{ id: '99', name: 'REJECTED, Kandidat' }],
        },
      }),
    )
    const wrapper = mount(CastView, { props: { id: '1' } })
    await flushPromises()

    const lists = wrapper.findAllComponents(SingleCastList)
    expect(lists).toHaveLength(2)
    for (const list of lists) {
      expect(list.props('notBooked')).toEqual([{ id: '99', name: 'REJECTED, Kandidat' }])
      expect(list.text()).toContain('REJECTED, Kandidat')
    }
  })
})
