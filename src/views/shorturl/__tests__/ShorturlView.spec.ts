import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import ShorturlView from '../ShorturlView.vue'
import type { Shorturl } from '@/composables/useShorturls'
import { formatUtcDateTime } from '@/services/dateFormat'

const mockItems = ref<Shorturl[]>([])
const mockUrlprefix = ref('https://go.hochamt.at.dev.schimpl.cc/')
const mockFetchList = vi.fn(async () => {})
const mockSave = vi.fn(async () => {})
const mockRemove = vi.fn(async () => {})

vi.mock('@/composables/useShorturls', () => ({
  useShorturls: () => ({
    items: mockItems,
    urlprefix: mockUrlprefix,
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
// come from vi.hoisted() too (1:1 FeeView.spec.ts's own note on this) -- a
// plain arrow function can't be used as a constructor.
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

function makeShorturl(overrides: Partial<Shorturl> = {}): Shorturl {
  return {
    id: 1,
    path: 'konzert',
    target: 'http://example.org',
    counter: 0,
    latestcall_at: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockItems.value = []
  mockUrlprefix.value = 'https://go.hochamt.at.dev.schimpl.cc/'
})

function rows(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('tbody tr')
}

describe('ShorturlView', () => {
  it('fetches and renders every shorturl as its own row', async () => {
    mockItems.value = [
      makeShorturl({ id: 1, path: 'konzert', target: 'http://example.org', counter: 5 }),
      makeShorturl({ id: 2, path: 'orgel', target: 'http://example.org/orgel', counter: 0 }),
    ]
    const wrapper = mount(ShorturlView)
    await flushPromises()

    expect(mockFetchList).toHaveBeenCalledOnce()
    expect(rows(wrapper)).toHaveLength(2)
  })

  it('renders path prefixed with urlprefix as a clickable link, target below it', async () => {
    mockItems.value = [makeShorturl({ path: 'konzert', target: 'http://example.org/foo' })]
    const wrapper = mount(ShorturlView)
    await flushPromises()

    const link = wrapper.find('a[href="https://go.hochamt.at.dev.schimpl.cc/konzert"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('konzert')

    const targetLink = wrapper.find('a[href="http://example.org/foo"]')
    expect(targetLink.exists()).toBe(true)
    expect(targetLink.text()).toBe('http://example.org/foo')
  })

  it('shows counter and latestcall_at, blank when never called', async () => {
    mockItems.value = [
      makeShorturl({ id: 1, counter: 7, latestcall_at: '2026-08-01T10:00:00+00:00' }),
      makeShorturl({ id: 2, path: 'never-called', counter: 0, latestcall_at: null }),
    ]
    const wrapper = mount(ShorturlView)
    await flushPromises()

    const firstRowCells = rows(wrapper)[0]!.findAll('td')
    expect(firstRowCells[2]?.text()).toBe('7')
    expect(firstRowCells[3]?.text()).toBe(formatUtcDateTime('2026-08-01T10:00:00+00:00'))

    const secondRowCells = rows(wrapper)[1]!.findAll('td')
    expect(secondRowCells[3]?.text()).toBe('')
  })

  it('creates a new shorturl via the modal form', async () => {
    mockSave.mockResolvedValueOnce(undefined)
    const wrapper = mount(ShorturlView)
    await flushPromises()

    await wrapper.find('button.btn-secondary.my-3').trigger('click')
    expect(mockModalShow).toHaveBeenCalled()

    await wrapper.find('input#shorturl-path').setValue('konzert')
    await wrapper.find('input#shorturl-target').setValue('example.org')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockSave).toHaveBeenCalledWith(null, { path: 'konzert', target: 'example.org' })
    expect(mockShowToast).toHaveBeenCalledWith('Element gespeichert')
    expect(mockModalHide).toHaveBeenCalled()
  })

  it('pre-fills the form and updates the existing shorturl when editing', async () => {
    mockItems.value = [makeShorturl({ id: 7, path: 'konzert', target: 'http://example.org' })]
    mockSave.mockResolvedValueOnce(undefined)
    const wrapper = mount(ShorturlView)
    await flushPromises()

    await wrapper.find('i[title="bearbeiten"]').trigger('click')
    expect((wrapper.find('input#shorturl-path').element as HTMLInputElement).value).toBe('konzert')
    expect((wrapper.find('input#shorturl-target').element as HTMLInputElement).value).toBe(
      'http://example.org',
    )

    await wrapper.find('input#shorturl-target').setValue('example.org/new')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockSave).toHaveBeenCalledWith(7, { path: 'konzert', target: 'example.org/new' })
  })

  it('shows field-level validation errors under the matching input', async () => {
    mockSave.mockRejectedValueOnce({
      response: {
        data: { detail: [{ loc: ['body', 'path'], msg: 'Der Pfad ist bereits vergeben.' }] },
      },
    })
    const wrapper = mount(ShorturlView)
    await flushPromises()

    await wrapper.find('input#shorturl-path').setValue('konzert')
    await wrapper.find('input#shorturl-target').setValue('example.org')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Der Pfad ist bereits vergeben.')
    expect(mockModalHide).not.toHaveBeenCalled()
  })

  it('deletes a shorturl after the user confirms', async () => {
    mockItems.value = [makeShorturl({ id: 3 })]
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockResolvedValueOnce(undefined)
    const wrapper = mount(ShorturlView)
    await flushPromises()

    await wrapper.find('i[title="löschen"]').trigger('click')
    await flushPromises()

    expect(mockConfirmAction).toHaveBeenCalledWith('Soll das Element wirklich gelöscht werden?')
    expect(mockRemove).toHaveBeenCalledWith(3)
    expect(mockShowToast).toHaveBeenCalledWith('Element gelöscht')
  })

  it('does not delete when the user cancels the confirmation', async () => {
    mockItems.value = [makeShorturl({ id: 3 })]
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(ShorturlView)
    await flushPromises()

    await wrapper.find('i[title="löschen"]').trigger('click')
    await flushPromises()

    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('does not render the table at all when there are no items', async () => {
    mockItems.value = []
    const wrapper = mount(ShorturlView)
    await flushPromises()

    expect(wrapper.find('table').exists()).toBe(false)
  })
})
