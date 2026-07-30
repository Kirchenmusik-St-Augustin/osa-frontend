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

describe('FeeView', () => {
  it('fetches and renders every fee with its amount', async () => {
    mockItems.value = [
      makeFee({ id: 1, name: 'Chor', amount: 0 }),
      makeFee({ id: 2, name: 'Instrumentalist', amount: 60 }),
    ]
    const wrapper = mount(FeeView)
    await flushPromises()

    expect(mockFetchList).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Chor (0,-)')
    expect(wrapper.text()).toContain('Instrumentalist (60,-)')
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
    expect(mockShowToast).toHaveBeenCalledWith('Honorar gespeichert')
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

  it('deletes a fee after the user confirms', async () => {
    mockItems.value = [makeFee({ id: 3 })]
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockResolvedValueOnce(undefined)
    const wrapper = mount(FeeView)
    await flushPromises()

    await wrapper.find('button[title="löschen"]').trigger('click')
    await flushPromises()

    expect(mockRemove).toHaveBeenCalledWith(3)
    expect(mockShowToast).toHaveBeenCalledWith('Honorar gelöscht')
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
