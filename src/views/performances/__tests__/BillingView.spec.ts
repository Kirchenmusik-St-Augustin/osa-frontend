import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import BillingView from '../BillingView.vue'
import type { PerformanceBilling } from '@/composables/useBookings'

const mockGetBilling = vi.fn()
vi.mock('@/composables/useBookings', () => ({
  useBookings: () => ({ getBilling: mockGetBilling }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ hasPermission: () => false }),
}))

function makeBilling(overrides: Partial<PerformanceBilling['billing']> = {}): PerformanceBilling {
  return {
    id: 1,
    ordinariumwork_name: 'Krönungsmesse',
    ordinariumwork_artist_name: 'MOZART, Wolfgang',
    artist_name: null,
    schedule: '2026-08-02T11:00:00',
    location: { id: 1, name: 'Augustinerkirche', color: '336699', address: null },
    user_booking: { status: 0, position: null, at: null },
    proprium: [],
    demanding_proprium: false,
    rehearsals: [],
    billing: {
      instruments: {
        items: [
          {
            id: 10,
            name: 'Fagott',
            quantity: 1,
            positions: [{ id: 5, name: 'HUBER, Franz', fee: 60 }],
            sum: 60,
          },
        ],
        sum: 60,
        count: 1,
      },
      voices: { items: [], sum: 0, count: 0 },
      choirjobs: { items: [], sum: 0, count: 0 },
      orgfee: { instruments: 30, choirjobs: 0, sum: 30 },
      extracost: { amount: 0, description: '' },
      sum: 90,
      ...overrides,
    },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('BillingView', () => {
  it('fetches and renders the billing breakdown', async () => {
    mockGetBilling.mockResolvedValueOnce(makeBilling())
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGetBilling).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Fagott')
    expect(wrapper.text()).toContain('HUBER, Franz')
    expect(wrapper.text()).toContain('90')
  })

  it('renders a N.N. position in grey when a slot is unfilled', async () => {
    mockGetBilling.mockResolvedValueOnce(
      makeBilling({
        instruments: {
          items: [
            {
              id: 10,
              name: 'Fagott',
              quantity: 1,
              positions: [{ id: null, name: 'N. N.', fee: 60 }],
              sum: 60,
            },
          ],
          sum: 60,
          count: 1,
        },
      }),
    )
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()

    const nnSpan = wrapper.findAll('span').find((span) => span.text() === 'N. N.')
    expect(nnSpan?.classes()).toContain('text-black-50')
  })

  it('hides extracost when the amount is zero and shows it otherwise, prefixed with "Extrakosten"', async () => {
    mockGetBilling.mockResolvedValueOnce(makeBilling())
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Sonderkosten')

    mockGetBilling.mockResolvedValueOnce(
      makeBilling({ extracost: { amount: 15, description: 'Sonderkosten Orgel' } }),
    )
    const wrapperWithExtra = mount(BillingView, { props: { id: '1' } })
    await flushPromises()
    expect(wrapperWithExtra.text()).toContain('Extrakosten (Sonderkosten Orgel)')
    expect(wrapperWithExtra.text()).toContain('15')
  })

  it('hides zero-sum type rows in the summary and shows the count for non-zero ones', async () => {
    // Legacy hides "Stimmen"/"Choraufgaben" summary rows entirely when
    // their sum is 0 (only "Instrumente (1)" is shown for makeBilling()'s
    // default fixture), unlike the item sections above it (whose headings
    // stay visible regardless, replicating Legacy's own dead v-if bug).
    mockGetBilling.mockResolvedValueOnce(makeBilling())
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Instrumente (1)')
    expect(wrapper.text()).not.toContain('Stimmen (0)')
    expect(wrapper.text()).not.toContain('Choraufgaben (0)')
  })

  it('hides the Einteilungstarif line for a zero-value orgfee type, shows a non-zero one parenthesized', async () => {
    mockGetBilling.mockResolvedValueOnce(makeBilling())
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Einteilungstarif (Instrumente)')
    expect(wrapper.text()).not.toContain('Einteilungstarif (Choraufgaben)')
  })

  it('labels the final total row "Summe", not "Gesamt"', async () => {
    mockGetBilling.mockResolvedValueOnce(makeBilling())
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Summe')
    expect(wrapper.text()).not.toContain('Gesamt')
  })

  it('renders both action buttons as btn-primary, matching Legacy (no btn-secondary)', async () => {
    mockGetBilling.mockResolvedValueOnce(makeBilling())
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()

    const printButtons = wrapper.findAll('button').filter((button) => button.text() === 'drucken')
    expect(printButtons).toHaveLength(2)
    for (const button of printButtons) {
      expect(button.classes()).toContain('btn-primary')
      expect(button.classes()).not.toContain('btn-secondary')
    }
  })

  it('uses the narrower col-md-7 column, matching Legacy (not col-md-8)', async () => {
    mockGetBilling.mockResolvedValueOnce(makeBilling())
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.find('.col-md-7').exists()).toBe(true)
    expect(wrapper.find('.col-md-8').exists()).toBe(false)
  })

  it('calls window.print when the print button is clicked', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    mockGetBilling.mockResolvedValueOnce(makeBilling())
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()

    const printButton = wrapper.findAll('button').find((button) => button.text() === 'drucken')
    await printButton?.trigger('click')

    expect(printSpy).toHaveBeenCalled()
    printSpy.mockRestore()
  })

  it('both "zurück" links go to the calendar month of the performance, not its show page', async () => {
    // Legacy's Billing.vue links "zurück" (both instances) to
    // `route('...performances.index', { year, month })` (the calendar),
    // never to the performance's own show/detail page.
    mockGetBilling.mockResolvedValueOnce(makeBilling())
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()

    const backLinks = wrapper.findAllComponents(RouterLinkStub)
    expect(backLinks).toHaveLength(2)
    for (const link of backLinks) {
      expect(link.props('to')).toEqual({ name: 'home', query: { year: 2026, month: 8 } })
    }
  })

  it('centers the Instrumente/Stimmen/Choraufgaben/Zusammenfassung subtitles like Legacy', async () => {
    mockGetBilling.mockResolvedValueOnce(makeBilling())
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()

    const subtitle = wrapper.findAll('.h4').find((el) => el.text() === 'Instrumente')
    expect(subtitle?.classes()).toContain('text-center')
    const summary = wrapper.findAll('.h4').find((el) => el.text() === 'Zusammenfassung')
    expect(summary?.classes()).toContain('text-center')
  })
})
