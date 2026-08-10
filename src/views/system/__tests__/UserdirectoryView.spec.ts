import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UserdirectoryView from '../UserdirectoryView.vue'
import type { DirectoryAbilities, DirectoryEntry } from '@/composables/useUserdirectory'

const mockGetAbilities = vi.fn()
const mockListUsers = vi.fn()
vi.mock('@/composables/useUserdirectory', () => ({
  useUserdirectory: () => ({ getAbilities: mockGetAbilities, listUsers: mockListUsers }),
}))

const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

function makeAbilities(): DirectoryAbilities {
  return {
    instruments: [{ id: 1, name: 'Fagott' }],
    voices: [],
    choirjobs: [{ id: 3, name: 'Substitut' }],
  }
}

const entries: DirectoryEntry[] = [
  {
    id: 5,
    surname: 'HUBER',
    givenname: 'Franz',
    has_email: true,
    email: 'huber@example.com',
    phone: '0664123456',
  },
  { id: 6, surname: 'MAYER', givenname: 'Anna', has_email: false, email: null, phone: null },
]

function rowCheckbox(wrapper: ReturnType<typeof mount>, index: number) {
  return wrapper.findAll('tbody tr')[index]!.find('input[type="checkbox"]')
}

beforeEach(() => {
  vi.resetAllMocks()
  mockGetAbilities.mockResolvedValue(makeAbilities())
  mockListUsers.mockResolvedValue([])
})

describe('UserdirectoryView', () => {
  it('loads the abilities catalog on mount, into the optgroups', async () => {
    const wrapper = mount(UserdirectoryView)
    await flushPromises()

    expect(mockGetAbilities).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Fagott')
    expect(wrapper.text()).toContain('Substitut')
  })

  it('defaults the dropdown to "alle" and fetches the full list immediately on mount', async () => {
    // 1:1 Legacy's SelectorComponent.vue (`selectedAbility = ref("all")`
    // + `{ immediate: true }` watcher) -- no manual selection required to
    // see the full directory.
    mockListUsers.mockResolvedValueOnce(entries)
    const wrapper = mount(UserdirectoryView)
    await flushPromises()

    expect(mockListUsers).toHaveBeenCalledWith('all', null)
    const select = wrapper.find('select').element as HTMLSelectElement
    expect(select.value).toBe('all')
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.text()).toContain('HUBER')
  })

  it('shows no table when the blank ability option is selected', async () => {
    mockListUsers.mockResolvedValueOnce(entries)
    const wrapper = mount(UserdirectoryView)
    await flushPromises()

    await wrapper.find('select').setValue('none')
    await flushPromises()

    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('fetches a specific type+id when a position option is selected', async () => {
    mockListUsers.mockResolvedValueOnce(entries).mockResolvedValueOnce([entries[0]!])
    const wrapper = mount(UserdirectoryView)
    await flushPromises()

    await wrapper.find('select').setValue('choirjobs@3')
    await flushPromises()

    expect(mockListUsers).toHaveBeenCalledWith('choirjobs', 3)
  })

  it('disables the checkbox for a user without a verified email', async () => {
    mockListUsers.mockResolvedValueOnce(entries)
    const wrapper = mount(UserdirectoryView)
    await flushPromises()

    expect(rowCheckbox(wrapper, 1).attributes('disabled')).toBeDefined()
    expect(rowCheckbox(wrapper, 0).attributes('disabled')).toBeUndefined()
  })

  it('"alle (N)" only counts users with a verified email', async () => {
    mockListUsers.mockResolvedValueOnce(entries)
    const wrapper = mount(UserdirectoryView)
    await flushPromises()

    expect(wrapper.text()).toContain('alle (1)')
  })

  it('checking "alle" selects every eligible user, unchecking clears the selection', async () => {
    mockListUsers.mockResolvedValueOnce(entries)
    const wrapper = mount(UserdirectoryView)
    await flushPromises()

    const checkAll = wrapper.find('#userdirectory-check-all')
    await checkAll.setValue(true)
    expect(rowCheckbox(wrapper, 0).element.checked).toBe(true)

    await checkAll.setValue(false)
    expect(rowCheckbox(wrapper, 0).element.checked).toBe(false)
  })

  it('only visually hides the copy links until a user is selected, keeping the line height reserved', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    mockListUsers.mockResolvedValueOnce(entries)
    const wrapper = mount(UserdirectoryView)
    await flushPromises()

    const copyLinkText = 'Mailing-Liste in Zwischenablage kopieren'
    const findCopyLinks = () => wrapper.findAll('div').filter((div) => div.text() === copyLinkText)
    expect(findCopyLinks()).toHaveLength(2)
    for (const link of findCopyLinks()) {
      expect(link.classes()).toContain('invisible')
    }

    await rowCheckbox(wrapper, 0).setValue(true)

    const copyLinks = findCopyLinks()
    for (const link of copyLinks) {
      expect(link.classes()).not.toContain('invisible')
    }
    await copyLinks[0]!.trigger('click')

    expect(writeText).toHaveBeenCalledWith('huber@example.com')
    expect(mockShowToast).toHaveBeenCalledWith('Mailing-Liste in Zwischenablage kopiert.')
  })
})
