import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ArtistShowView from '../ArtistShowView.vue'
import type { Artist } from '@/composables/useArtists'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockGet = vi.fn()
const mockRemove = vi.fn()
vi.mock('@/composables/useArtists', () => ({
  useArtists: () => ({ get: mockGet, remove: mockRemove }),
}))

const mockConfirmAction = vi.fn()
const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  confirmAction: (...args: unknown[]) => mockConfirmAction(...args),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

function makeArtist(overrides: Partial<Artist> = {}): Artist {
  return {
    id: 1,
    surname: 'MOZART',
    givenname: 'Wolfgang',
    description: null,
    birthyear: null,
    deathyear: null,
    composer: false,
    conductor: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ArtistShowView', () => {
  it('loads and renders only the truthy fields', async () => {
    mockGet.mockResolvedValueOnce(
      makeArtist({ description: null, birthyear: 1756, deathyear: null }),
    )
    const wrapper = mount(ArtistShowView, { props: { id: '1' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Wolfgang')
    expect(wrapper.text()).toContain('MOZART')
    expect(wrapper.text()).toContain('1756')
    expect(wrapper.text()).not.toContain('Todesjahr')
    expect(wrapper.text()).not.toContain('Beschreibung')
  })

  it('shows "Gelistet als" only when composer or conductor is set', async () => {
    mockGet.mockResolvedValueOnce(makeArtist({ composer: true, conductor: true }))
    const wrapper = mount(ArtistShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Gelistet als')
    expect(wrapper.text()).toContain('Komponist')
    expect(wrapper.text()).toContain('Dirigent')
  })

  it('omits "Gelistet als" when neither composer nor conductor is set', async () => {
    mockGet.mockResolvedValueOnce(makeArtist())
    const wrapper = mount(ArtistShowView, { props: { id: '1' } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Gelistet als')
  })

  it('deletes after confirmation and navigates back to search', async () => {
    mockGet.mockResolvedValueOnce(makeArtist())
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockResolvedValueOnce(undefined)
    const wrapper = mount(ArtistShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('button.btn-danger').trigger('click')
    await flushPromises()

    expect(mockRemove).toHaveBeenCalledWith(1)
    expect(mockShowToast).toHaveBeenCalledWith('gelöscht.')
    expect(mockPush).toHaveBeenCalledWith({ name: 'repertoire-artists-search' })
  })

  it('does not delete when the user cancels the confirmation', async () => {
    mockGet.mockResolvedValueOnce(makeArtist())
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(ArtistShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('button.btn-danger').trigger('click')
    await flushPromises()

    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('shows the German in-use message when delete is blocked', async () => {
    mockGet.mockResolvedValueOnce(makeArtist())
    mockConfirmAction.mockResolvedValueOnce(true)
    mockRemove.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['body', 'general'], msg: 'in use' }] } },
    })
    const wrapper = mount(ArtistShowView, { props: { id: '1' } })
    await flushPromises()

    await wrapper.find('button.btn-danger').trigger('click')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith('in use', true)
  })
})
