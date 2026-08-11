import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PropriumworkShowView from '../PropriumworkShowView.vue'
import type { Propriumwork } from '@/composables/usePropriumworks'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockGet = vi.fn()
const mockRemove = vi.fn()
vi.mock('@/composables/usePropriumworks', () => ({
  usePropriumworks: () => ({ get: mockGet, remove: mockRemove }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

function makeWork(overrides: Partial<Propriumwork> = {}): Propriumwork {
  return {
    id: 1,
    name: 'Introitus',
    description: null,
    artist_id: 2,
    artist_name: 'HAYDN, Joseph',
    duration: null,
    demanding: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('PropriumworkShowView', () => {
  it('loads and renders name/composer, hiding empty optional fields', async () => {
    mockGet.mockResolvedValueOnce(makeWork({ duration: 5 }))
    const wrapper = mount(PropriumworkShowView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Introitus')
    expect(wrapper.text()).toContain('HAYDN, Joseph')
    expect(wrapper.text()).toContain('5 Minuten')
    expect(wrapper.text()).not.toContain('Beschreibung')
  })

  it('shows "anspruchsvoll" in red text when demanding', async () => {
    mockGet.mockResolvedValueOnce(makeWork({ demanding: true }))
    const wrapper = mount(PropriumworkShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.find('.text-danger').text()).toBe('anspruchsvoll')
  })

  it('deletes after confirmation with the calendar-specific in-use message', async () => {
    mockGet.mockResolvedValueOnce(makeWork())
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockRejectedValueOnce(new Error('blocked'))
    const wrapper = mount(PropriumworkShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('button.btn-danger').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(
      'Die Proprium-Komposition kann nicht gelöscht werden, da sie im Kalender verwendet wird.',
      true,
    )
  })

  it('navigates back to search after a successful delete', async () => {
    mockGet.mockResolvedValueOnce(makeWork())
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockResolvedValueOnce(undefined)
    const wrapper = mount(PropriumworkShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('button.btn-danger').trigger('click')
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({ name: 'repertoire-propriumworks-search' })
  })
})
