import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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

  it('hides extracost when the amount is zero and shows it otherwise', async () => {
    mockGetBilling.mockResolvedValueOnce(makeBilling())
    const wrapper = mount(BillingView, { props: { id: '1' } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Sonderkosten')

    mockGetBilling.mockResolvedValueOnce(
      makeBilling({ extracost: { amount: 15, description: 'Sonderkosten Orgel' } }),
    )
    const wrapperWithExtra = mount(BillingView, { props: { id: '1' } })
    await flushPromises()
    expect(wrapperWithExtra.text()).toContain('Sonderkosten Orgel')
    expect(wrapperWithExtra.text()).toContain('15')
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
})
