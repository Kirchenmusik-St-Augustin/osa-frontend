import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import FeeView from '../FeeView.vue'
import type { Fee } from '@/composables/useFees'

const mockItems = ref<Fee[]>([])
const mockFetchList = vi.fn(async () => {})
const mockSave = vi.fn(async () => {})
const mockRemove = vi.fn(async () => {})

vi.mock('@/composables/useFees', () => ({
  useFees: () => ({
    items: mockItems,
    fetchList: mockFetchList,
    save: mockSave,
    remove: mockRemove,
  }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

// vi.mock factories run above every import, so the mocked Modal class must
// come from vi.hoisted() too (1:1 CoreelementView.spec.ts's own note on
// this) -- a plain arrow function can't be used as a constructor.
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

function makeFee(overrides: Partial<Fee> = {}): Fee {
  return { id: 1, name: 'Chor', amount: 0, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockItems.value = []
})

function rows(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('tbody tr')
}

describe('FeeView', () => {
  it('fetches and renders every fee as its own row, name and amount in separate cells', async () => {
    // Legacy's table cell is just the raw number (`td.fw-bold {{
    // fee.amount }}`), no "(amount,-)" wrapper -- that formatting was a
    // deviation from an earlier list-group-based port.
    mockItems.value = [
      makeFee({ id: 1, name: 'Chor', amount: 0 }),
      makeFee({ id: 2, name: 'Instrumentalist', amount: 60 }),
    ]
    const wrapper = mount(FeeView)
    await flushPromises()

    expect(mockFetchList).toHaveBeenCalledOnce()
    const cells = rows(wrapper).map((row) => row.findAll('td').map((td) => td.text()))
    expect(cells[0]?.slice(0, 2)).toEqual(['Chor', '0'])
    expect(cells[1]?.slice(0, 2)).toEqual(['Instrumentalist', '60'])
  })

  it('sorts by name ascending by default, regardless of the order fees arrive in', async () => {
    // The real backend already pre-sorts by name (Fee::OrderByName scope,
    // see fee_service.list_fees's docstring), so defaulting the sort here
    // to name-ascending produces the identical real-world page-load
    // result as Legacy more simply/robustly than trying to leave the
    // arrival order untouched -- which Legacy's own initial-sort line
    // never actually did either, it's dead code (see FeeView.vue's
    // docstring).
    mockItems.value = [
      makeFee({ id: 1, name: 'Solist', amount: 130 }),
      makeFee({ id: 2, name: 'Chor', amount: 0 }),
    ]
    const wrapper = mount(FeeView)
    await flushPromises()

    expect(rows(wrapper).map((row) => row.findAll('td')[0]?.text())).toEqual(['Chor', 'Solist'])
  })

  it('sorts ascending/descending by Name on repeated clicks, and resets to ascending when switching to Betrag', async () => {
    mockItems.value = [
      makeFee({ id: 1, name: 'Solist', amount: 130 }),
      makeFee({ id: 2, name: 'Chor', amount: 0 }),
      makeFee({ id: 3, name: 'Instrumentalist', amount: 60 }),
    ]
    const wrapper = mount(FeeView)
    await flushPromises()

    const nameHeader = wrapper.findAll('th')[0]!
    const amountHeader = wrapper.findAll('th')[1]!
    const names = () => rows(wrapper).map((row) => row.findAll('td')[0]?.text())

    // Name is already the default active sort column (ascending) --
    // clicking it the first time flips to descending, 1:1 Legacy's own
    // toggleSort('name') behaved the exact same way from its identical
    // default state (orderCol/orderDirection both start as 'name'/asc).
    await nameHeader.trigger('click')
    expect(names()).toEqual(['Solist', 'Instrumentalist', 'Chor'])
    expect(nameHeader.find('.fa-caret-down').exists()).toBe(true)

    await nameHeader.trigger('click')
    expect(names()).toEqual(['Chor', 'Instrumentalist', 'Solist'])
    expect(nameHeader.find('.fa-caret-up').exists()).toBe(true)

    await amountHeader.trigger('click')
    const amounts = rows(wrapper).map((row) => row.findAll('td')[1]?.text())
    expect(amounts).toEqual(['0', '60', '130'])
    expect(amountHeader.find('.fa-caret-up').exists()).toBe(true)
    // Switching column resets to ascending -- the Name header's own caret
    // must be gone now that it's no longer the active sort column.
    expect(nameHeader.find('.fa-caret-up').exists()).toBe(false)
    expect(nameHeader.find('.fa-caret-down').exists()).toBe(false)
  })

  it('creates a new fee via the modal form', async () => {
    mockSave.mockResolvedValueOnce(undefined)
    const wrapper = mount(FeeView)
    await flushPromises()

    await wrapper.find('button.btn-secondary.my-3').trigger('click')
    expect(mockModalShow).toHaveBeenCalled()

    await wrapper.find('input#fee-name').setValue('Solist')
    await wrapper.find('input#fee-amount').setValue(80)
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockSave).toHaveBeenCalledWith(null, { name: 'Solist', amount: 80 })
    // Legacy's Fees/Index.vue toasts "Tarif gespeichert" (singular "Tarif",
    // matching the page's own "Tarife verwalten" title) -- not "Honorar".
    expect(mockShowToast).toHaveBeenCalledWith('Tarif gespeichert')
    expect(mockModalHide).toHaveBeenCalled()
  })

  it('pre-fills the form and updates the existing fee when editing', async () => {
    mockItems.value = [makeFee({ id: 7, name: 'Chor', amount: 0 })]
    mockSave.mockResolvedValueOnce(undefined)
    const wrapper = mount(FeeView)
    await flushPromises()

    await wrapper.find('button[title="bearbeiten"]').trigger('click')
    expect((wrapper.find('input#fee-name').element as HTMLInputElement).value).toBe('Chor')
    expect((wrapper.find('input#fee-amount').element as HTMLInputElement).value).toBe('0')

    await wrapper.find('input#fee-amount').setValue(15)
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockSave).toHaveBeenCalledWith(7, { name: 'Chor', amount: 15 })
  })

  it('shows field-level validation errors under the matching input', async () => {
    mockSave.mockRejectedValueOnce({
      response: {
        data: { detail: [{ loc: ['body', 'name'], msg: 'Der Name ist bereits vergeben.' }] },
      },
    })
    const wrapper = mount(FeeView)
    await flushPromises()

    await wrapper.find('input#fee-name').setValue('Chor')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Der Name ist bereits vergeben.')
    expect(mockModalHide).not.toHaveBeenCalled()
  })

  it('deletes a fee after the user confirms, using Legacy\'s generic "Element" confirm/toast copy', async () => {
    mockItems.value = [makeFee({ id: 3 })]
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockResolvedValueOnce(undefined)
    const wrapper = mount(FeeView)
    await flushPromises()

    await wrapper.find('button[title="löschen"]').trigger('click')
    await flushPromises()

    // Legacy's deleteId() uses the generic "Soll das Element wirklich
    // gelöscht werden?"/"Element gelöscht" copy here, not "Honorar" --
    // same generic wording the Coreelement pages already use.
    expect(mockConfirmAction).toHaveBeenCalledWith('Soll das Element wirklich gelöscht werden?')
    expect(mockRemove).toHaveBeenCalledWith(3)
    expect(mockShowToast).toHaveBeenCalledWith('Element gelöscht')
  })

  it('does not delete when the user cancels the confirmation', async () => {
    mockItems.value = [makeFee({ id: 3 })]
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(FeeView)
    await flushPromises()

    await wrapper.find('button[title="löschen"]').trigger('click')
    await flushPromises()

    expect(mockRemove).not.toHaveBeenCalled()
  })
})
