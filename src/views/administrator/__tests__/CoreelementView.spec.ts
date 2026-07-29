import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import CoreelementView from '../CoreelementView.vue'
import type { Coreelement } from '@/composables/useCoreelements'

const mockItems = ref<Coreelement[]>([])
const mockFetchList = vi.fn(async () => {})
const mockSave = vi.fn(async () => {})
const mockRemove = vi.fn(async () => {})
const mockMove = vi.fn(async () => {})

vi.mock('@/composables/useCoreelements', () => ({
  useCoreelements: () => ({
    items: mockItems,
    fetchList: mockFetchList,
    save: mockSave,
    remove: mockRemove,
    move: mockMove,
  }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

// vi.mock factories are hoisted above every import in this file -- since
// CoreelementView.vue itself imports 'bootstrap' at the top, the mocked
// class must come from vi.hoisted() too, or it's still in its temporal
// dead zone when the factory actually runs (1:1 the mockPush/
// mockCurrentRoute pattern in services/__tests__/api.spec.ts). Also note
// arrow functions can never be used as constructors (`new (() => {})()`
// throws), so this needs an actual class, not `.mockImplementation(() => ...)`.
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

function makeItem(overrides: Partial<Coreelement> = {}): Coreelement {
  return {
    id: 1,
    name: 'Fagott',
    order: 1,
    label: null,
    description: null,
    address: null,
    color: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockItems.value = []
})

describe('CoreelementView', () => {
  it('reloads the list and updates the heading when the type prop changes', async () => {
    // Regression test: Vue Router reuses this component instance across
    // navigations between two administrator-coreelement routes (e.g. via
    // the Administrator navbar dropdown), so onMounted() alone isn't
    // enough -- a watcher on the type prop must trigger the reload.
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()
    expect(mockFetchList).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ type: 'voice' })
    await flushPromises()

    expect(wrapper.text()).toContain('Stimmen')
    expect(mockFetchList).toHaveBeenCalledTimes(2)
  })

  it('shows the German label for the type as heading and fetches the list', async () => {
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Instrumente')
    expect(mockFetchList).toHaveBeenCalledOnce()
  })

  it('renders every item name in the list', async () => {
    mockItems.value = [makeItem({ id: 1, name: 'Fagott' }), makeItem({ id: 2, name: 'Oboe' })]
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Fagott')
    expect(wrapper.text()).toContain('Oboe')
  })

  it('only shows label/description fields for the role type', async () => {
    const wrapper = mount(CoreelementView, { props: { type: 'role' } })
    await flushPromises()

    expect(wrapper.find('input#coreelement-label').exists()).toBe(true)
    expect(wrapper.find('textarea#coreelement-description').exists()).toBe(true)
    expect(wrapper.find('textarea#coreelement-address').exists()).toBe(false)
  })

  it('only shows address/color fields for the location type', async () => {
    const wrapper = mount(CoreelementView, { props: { type: 'location' } })
    await flushPromises()

    expect(wrapper.find('textarea#coreelement-address').exists()).toBe(true)
    expect(wrapper.find('input#coreelement-color').exists()).toBe(true)
    expect(wrapper.find('input#coreelement-label').exists()).toBe(false)
  })

  it('shows neither extra field set for a plain type like instrument', async () => {
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()

    expect(wrapper.find('input#coreelement-label').exists()).toBe(false)
    expect(wrapper.find('textarea#coreelement-address').exists()).toBe(false)
  })

  it('creates a new item via the modal form', async () => {
    mockSave.mockResolvedValueOnce(undefined)
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()

    await wrapper.find('button.btn-secondary.my-3').trigger('click')
    expect(mockModalShow).toHaveBeenCalled()
    await wrapper.find('input#coreelement-name').setValue('Fagott')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockSave).toHaveBeenCalledWith(null, { name: 'Fagott' })
    expect(mockShowToast).toHaveBeenCalledWith('Element gespeichert')
    expect(mockModalHide).toHaveBeenCalled()
  })

  it('builds a location payload with only the relevant extra fields', async () => {
    mockSave.mockResolvedValueOnce(undefined)
    const wrapper = mount(CoreelementView, { props: { type: 'location' } })
    await flushPromises()

    await wrapper.find('input#coreelement-name').setValue('Chorraum')
    await wrapper.find('textarea#coreelement-address').setValue('Hauptstraße 1')
    await wrapper.find('input#coreelement-color').setValue('ff0000')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockSave).toHaveBeenCalledWith(null, {
      name: 'Chorraum',
      address: 'Hauptstraße 1',
      color: 'ff0000',
    })
  })

  it('pre-fills the form and updates the existing item when editing', async () => {
    mockItems.value = [makeItem({ id: 7, name: 'Fagott' })]
    mockSave.mockResolvedValueOnce(undefined)
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()

    await wrapper.find('button[title="bearbeiten"]').trigger('click')
    expect((wrapper.find('input#coreelement-name').element as HTMLInputElement).value).toBe(
      'Fagott',
    )

    await wrapper.find('input#coreelement-name').setValue('Kontrafagott')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockSave).toHaveBeenCalledWith(7, { name: 'Kontrafagott' })
  })

  it('shows field-level validation errors under the matching input', async () => {
    mockSave.mockRejectedValueOnce({
      response: {
        data: { detail: [{ loc: ['body', 'name'], msg: 'Der Name ist bereits vergeben.' }] },
      },
    })
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()

    await wrapper.find('input#coreelement-name').setValue('Fagott')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Der Name ist bereits vergeben.')
    expect(mockModalHide).not.toHaveBeenCalled()
  })

  it('deletes an item after the user confirms', async () => {
    mockItems.value = [makeItem({ id: 3, name: 'Fagott' })]
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockResolvedValueOnce(undefined)
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()

    await wrapper.find('button[title="löschen"]').trigger('click')
    await flushPromises()

    expect(mockRemove).toHaveBeenCalledWith(3)
    expect(mockShowToast).toHaveBeenCalledWith('Element gelöscht')
  })

  it('does not delete when the user cancels the confirmation', async () => {
    mockItems.value = [makeItem({ id: 3 })]
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()

    await wrapper.find('button[title="löschen"]').trigger('click')
    await flushPromises()

    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('shows the backend\'s "in use" message as an error toast', async () => {
    mockItems.value = [makeItem({ id: 3 })]
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockRejectedValueOnce({
      response: {
        data: {
          detail: [
            {
              loc: ['body', 'general'],
              msg: 'Das Element kann nicht gelöscht werden, da es noch in Verwendung ist.',
            },
          ],
        },
      },
    })
    const wrapper = mount(CoreelementView, { props: { type: 'role' } })
    await flushPromises()

    await wrapper.find('button[title="löschen"]').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(
      'Das Element kann nicht gelöscht werden, da es noch in Verwendung ist.',
      true,
    )
  })

  it('disables the up-arrow for the first item and the down-arrow for the last', async () => {
    mockItems.value = [makeItem({ id: 1, name: 'Erstes' }), makeItem({ id: 2, name: 'Letztes' })]
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()

    const rows = wrapper.findAll('.list-group-item')
    expect(rows[0]?.find('button[title="nach oben bewegen"]').attributes('disabled')).toBeDefined()
    expect(rows[1]?.find('button[title="nach unten bewegen"]').attributes('disabled')).toBeDefined()
    expect(
      rows[0]?.find('button[title="nach unten bewegen"]').attributes('disabled'),
    ).toBeUndefined()
  })

  it('moves an item up when the up-arrow is clicked', async () => {
    mockItems.value = [makeItem({ id: 1, name: 'Erstes' }), makeItem({ id: 2, name: 'Zweites' })]
    mockMove.mockResolvedValueOnce(undefined)
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()

    const rows = wrapper.findAll('.list-group-item')
    await rows[1]?.find('button[title="nach oben bewegen"]').trigger('click')
    await flushPromises()

    expect(mockMove).toHaveBeenCalledWith(2, 'up')
  })

  it('shows an error toast when move fails', async () => {
    mockItems.value = [makeItem({ id: 1 }), makeItem({ id: 2 })]
    mockMove.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount(CoreelementView, { props: { type: 'instrument' } })
    await flushPromises()

    const rows = wrapper.findAll('.list-group-item')
    await rows[1]?.find('button[title="nach oben bewegen"]').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('Ein unerwarteter Fehler ist aufgetreten.', true)
  })

  it('shows field-level validation errors for the role-specific fields', async () => {
    mockSave.mockRejectedValueOnce({
      response: {
        data: {
          detail: [
            { loc: ['body', 'label'], msg: 'Der Wert ist bereits vergeben.' },
            { loc: ['body', 'description'], msg: 'Dieses Feld ist erforderlich.' },
          ],
        },
      },
    })
    const wrapper = mount(CoreelementView, { props: { type: 'role' } })
    await flushPromises()

    await wrapper.find('input#coreelement-name').setValue('scores')
    await wrapper.find('input#coreelement-label').setValue('Noten')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Der Wert ist bereits vergeben.')
    expect(wrapper.text()).toContain('Dieses Feld ist erforderlich.')
  })
})
