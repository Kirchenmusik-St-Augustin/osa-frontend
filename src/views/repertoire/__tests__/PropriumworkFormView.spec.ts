import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PropriumworkFormView from '../PropriumworkFormView.vue'
import type { Propriumwork } from '@/composables/usePropriumworks'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockListComposers = vi.fn()
vi.mock('@/composables/useArtists', () => ({
  useArtists: () => ({ listComposers: mockListComposers }),
}))

const mockGet = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/composables/usePropriumworks', () => ({
  usePropriumworks: () => ({ get: mockGet, create: mockCreate, update: mockUpdate }),
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
    duration: 5,
    demanding: false,
    ...overrides,
  }
}

beforeEach(() => {
  // See feedback_frontend_gotchas: resetAllMocks avoids a queued
  // mockXOnce() value from one test leaking into a later test's call
  // when several async composable mocks are chained per test.
  vi.resetAllMocks()
  mockConfirmAction.mockResolvedValue(true)
  mockListComposers.mockResolvedValue([{ id: 2, label: 'HAYDN, Joseph' }])
})

describe('PropriumworkFormView', () => {
  it('does not fetch an existing work when creating', async () => {
    mockCreate.mockResolvedValueOnce(makeWork({ id: 9 }))
    const wrapper = mount(PropriumworkFormView, { props: {} })
    await flushPromises()

    expect(mockGet).not.toHaveBeenCalled()
    expect(mockListComposers).toHaveBeenCalled()
    expect(wrapper.find('input#propriumwork-name').exists()).toBe(true)
  })

  it('creates a new work on save', async () => {
    mockCreate.mockResolvedValueOnce(makeWork({ id: 9 }))
    const wrapper = mount(PropriumworkFormView, { props: {} })
    await flushPromises()

    await wrapper.find('input#propriumwork-name').setValue('Graduale')
    await wrapper.find('select#propriumwork-artist').setValue('2')
    await wrapper.find('input#propriumwork-duration').setValue('10')
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Graduale',
      description: null,
      artist_id: 2,
      duration: 10,
      demanding: false,
    })
    expect(mockShowToast).toHaveBeenCalledWith('gespeichert.')
    expect(mockPush).toHaveBeenCalledWith({
      name: 'repertoire-propriumworks-show',
      params: { id: 9 },
    })
  })

  it('pre-fills the form and updates the existing work when editing', async () => {
    mockGet.mockResolvedValueOnce(makeWork())
    mockUpdate.mockResolvedValueOnce(makeWork())
    const wrapper = mount(PropriumworkFormView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(1)
    expect((wrapper.find('input#propriumwork-name').element as HTMLInputElement).value).toBe(
      'Introitus',
    )

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Introitus' }))
  })

  it('shows field-level validation errors under the matching input', async () => {
    mockCreate.mockRejectedValueOnce({
      response: {
        data: {
          detail: [{ loc: ['body', 'duration'], msg: 'Muss zwischen 1 und 999 liegen.' }],
        },
      },
    })
    const wrapper = mount(PropriumworkFormView, { props: {} })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Muss zwischen 1 und 999 liegen.')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
