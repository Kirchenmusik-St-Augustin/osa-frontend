import type * as VueRouter from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ArtistFormView from '../ArtistFormView.vue'
import type { Artist } from '@/composables/useArtists'

const mockPush = vi.fn().mockResolvedValue(undefined)
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof VueRouter>()),
  useRouter: () => ({ push: mockPush }),
}))

const mockGet = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/composables/useArtists', () => ({
  useArtists: () => ({ get: mockGet, create: mockCreate, update: mockUpdate }),
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
  mockConfirmAction.mockResolvedValue(true)
})

describe('ArtistFormView', () => {
  it('starts empty and creates a new artist on save', async () => {
    mockCreate.mockResolvedValueOnce(makeArtist({ id: 9 }))
    const wrapper = mount(ArtistFormView, { props: {} })
    await flushPromises()

    expect(mockGet).not.toHaveBeenCalled()
    await wrapper.find('input#artist-givenname').setValue('Wolfgang')
    await wrapper.find('input#artist-surname').setValue('Mozart')
    await wrapper.find('input#artist-birthyear').setValue('1756')
    await wrapper.find('input#artist-deathyear').setValue('1791')
    await wrapper.find('input#artist-composer').setValue(true)
    await wrapper.find('input#artist-conductor').setValue(true)
    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockCreate).toHaveBeenCalledWith({
      givenname: 'Wolfgang',
      surname: 'Mozart',
      description: null,
      birthyear: 1756,
      deathyear: 1791,
      composer: true,
      conductor: true,
    })
    expect(mockShowToast).toHaveBeenCalledWith('gespeichert.')
    expect(mockPush).toHaveBeenCalledWith({
      name: 'repertoire-artists-show',
      params: { id: 9 },
    })
  })

  it('pre-fills the form and updates the existing artist when editing', async () => {
    mockGet.mockResolvedValueOnce(makeArtist({ id: 5, birthyear: 1756 }))
    mockUpdate.mockResolvedValueOnce(makeArtist({ id: 5 }))
    const wrapper = mount(ArtistFormView, { props: { id: '5' } })
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(5)
    expect((wrapper.find('input#artist-surname').element as HTMLInputElement).value).toBe('MOZART')
    expect((wrapper.find('input#artist-birthyear').element as HTMLInputElement).value).toBe('1756')

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith(5, expect.objectContaining({ birthyear: 1756 }))
  })

  it('does not save when the user cancels the confirmation', async () => {
    mockConfirmAction.mockResolvedValueOnce(false)
    const wrapper = mount(ArtistFormView, { props: {} })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('shows field-level validation errors under the matching input', async () => {
    mockCreate.mockRejectedValueOnce({
      response: {
        data: {
          detail: [{ loc: ['body', 'surname'], msg: 'Muss zwischen 3 und 32 Zeichen lang sein.' }],
        },
      },
    })
    const wrapper = mount(ArtistFormView, { props: {} })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Muss zwischen 3 und 32 Zeichen lang sein.')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
