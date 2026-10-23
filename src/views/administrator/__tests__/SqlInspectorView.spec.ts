import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SqlInspectorView from '../SqlInspectorView.vue'
import type { TableData } from '@/composables/useSqlInspector'

const mockListTables = vi.fn()
const mockGetTableData = vi.fn()
vi.mock('@/composables/useSqlInspector', () => ({
  useSqlInspector: () => ({ listTables: mockListTables, getTableData: mockGetTableData }),
}))

const mockShowToast = vi.fn()
vi.mock('@/services/notifications', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

function makeTableData(overrides: Partial<TableData> = {}): TableData {
  return {
    table_name: 'users',
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, primary_key: true },
      { name: 'phone', type: 'TEXT', nullable: true, primary_key: false },
    ],
    rows: [{ id: '1', phone: null }],
    total: 1,
    page: 1,
    page_size: 25,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SqlInspectorView', () => {
  it('fetches the table list on mount', async () => {
    mockListTables.mockResolvedValueOnce(['users', 'roles'])

    const wrapper = mount(SqlInspectorView)
    await flushPromises()

    expect(mockListTables).toHaveBeenCalled()
    expect(wrapper.findAll('option').length).toBeGreaterThanOrEqual(2)
  })

  it('does not show structure or data before a table is selected', async () => {
    mockListTables.mockResolvedValueOnce(['users'])

    const wrapper = mount(SqlInspectorView)
    await flushPromises()

    expect(mockGetTableData).not.toHaveBeenCalled()
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('loads and shows row data and total once a table is selected', async () => {
    mockListTables.mockResolvedValueOnce(['users'])
    mockGetTableData.mockResolvedValueOnce(makeTableData())

    const wrapper = mount(SqlInspectorView)
    await flushPromises()
    await wrapper.find('select').setValue('users')
    await flushPromises()

    expect(mockGetTableData).toHaveBeenCalledWith('users', 1, 25)
    expect(wrapper.text()).toContain('1 Zeile(n) insgesamt.')
    // phone is null -- rendered as a dash, not the literal "null".
    expect(wrapper.text()).not.toContain('null')
    expect(wrapper.text()).toContain('–')
  })

  it('shows the column structure (PK badge, nullable Ja/Nein) once expanded', async () => {
    mockListTables.mockResolvedValueOnce(['users'])
    mockGetTableData.mockResolvedValueOnce(makeTableData())

    const wrapper = mount(SqlInspectorView)
    await flushPromises()
    await wrapper.find('select').setValue('users')
    await flushPromises()
    await wrapper.find('.c-pointer').trigger('click')

    expect(wrapper.text()).toContain('PK')
    expect(wrapper.text()).toContain('Ja')
    expect(wrapper.text()).toContain('Nein')
  })

  it('resets to page 1 and refetches when switching tables', async () => {
    mockListTables.mockResolvedValueOnce(['users', 'roles'])
    mockGetTableData
      .mockResolvedValueOnce(makeTableData({ total: 60 }))
      .mockResolvedValueOnce(makeTableData({ table_name: 'roles', total: 5 }))

    const wrapper = mount(SqlInspectorView)
    await flushPromises()
    await wrapper.find('select').setValue('users')
    await flushPromises()
    await wrapper.findAll('nav button').at(1)?.trigger('click') // "Weiter" -> page 2
    await flushPromises()

    await wrapper.find('select').setValue('roles')
    await flushPromises()

    expect(mockGetTableData).toHaveBeenLastCalledWith('roles', 1, 25)
  })

  it('advances the page and disables prev/next at the pagination boundaries', async () => {
    mockListTables.mockResolvedValueOnce(['users'])
    mockGetTableData
      .mockResolvedValueOnce(makeTableData({ total: 30 })) // page 1 of 2
      .mockResolvedValueOnce(makeTableData({ total: 30, page: 2 })) // page 2 of 2

    const wrapper = mount(SqlInspectorView)
    await flushPromises()
    await wrapper.find('select').setValue('users')
    await flushPromises()

    const buttonsPage1 = wrapper.findAll('nav button')
    expect(buttonsPage1[0]?.attributes('disabled')).toBeDefined() // "Zurück" at page 1
    expect(buttonsPage1[1]?.attributes('disabled')).toBeUndefined() // "Weiter" enabled

    await buttonsPage1[1]?.trigger('click')
    await flushPromises()

    expect(mockGetTableData).toHaveBeenLastCalledWith('users', 2, 25)
    const buttonsPage2 = wrapper.findAll('nav button')
    expect(buttonsPage2[1]?.attributes('disabled')).toBeDefined() // "Weiter" at last page
  })

  it('shows an error toast when the table list fetch fails', async () => {
    mockListTables.mockRejectedValueOnce(new Error('network error'))

    mount(SqlInspectorView)
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), true)
  })

  it('shows an error toast when the table data fetch fails', async () => {
    mockListTables.mockResolvedValueOnce(['users'])
    mockGetTableData.mockRejectedValueOnce(new Error('not found'))

    const wrapper = mount(SqlInspectorView)
    await flushPromises()
    await wrapper.find('select').setValue('users')
    await flushPromises()

    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), true)
  })

  it('shows the fixed texts when the table list or the table data fail with a field-only answer', async () => {
    mockListTables.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'x'], msg: 'Ungültig.' }] } },
    })
    mount(SqlInspectorView)
    await flushPromises()
    expect(mockShowToast).toHaveBeenLastCalledWith(
      'Tabellenliste konnte nicht geladen werden.',
      true,
    )

    mockListTables.mockResolvedValueOnce(['users'])
    mockGetTableData.mockRejectedValueOnce({
      response: { data: { detail: [{ loc: ['query', 'x'], msg: 'Ungültig.' }] } },
    })
    const wrapper = mount(SqlInspectorView)
    await flushPromises()
    await wrapper.find('select').setValue('users')
    await flushPromises()
    expect(mockShowToast).toHaveBeenLastCalledWith(
      'Tabellendaten konnten nicht geladen werden.',
      true,
    )
  })

  it('goes back one page with "Zurück" and shows nothing for an empty selection', async () => {
    mockListTables.mockResolvedValueOnce(['users'])
    mockGetTableData
      .mockResolvedValueOnce(makeTableData({ total: 30 }))
      .mockResolvedValueOnce(makeTableData({ total: 30, page: 2 }))
      .mockResolvedValueOnce(makeTableData({ total: 30 }))
    const wrapper = mount(SqlInspectorView)
    await flushPromises()
    await wrapper.find('select').setValue('')
    await flushPromises()
    expect(mockGetTableData).not.toHaveBeenCalled()

    await wrapper.find('select').setValue('users')
    await flushPromises()
    await wrapper.findAll('nav button')[1]?.trigger('click')
    await flushPromises()
    await wrapper.findAll('nav button')[0]?.trigger('click')
    await flushPromises()

    expect(mockGetTableData).toHaveBeenLastCalledWith('users', 1, 25)
  })

  it('shows the rows of the LAST table choice when an earlier answer arrives late', async () => {
    mockListTables.mockResolvedValueOnce(['users', 'roles'])
    let finishFirst: (value: TableData) => void = () => {}
    mockGetTableData.mockReturnValueOnce(
      new Promise<TableData>((resolve) => {
        finishFirst = resolve
      }),
    )
    mockGetTableData.mockResolvedValueOnce(
      makeTableData({ table_name: 'roles', rows: [{ id: '2', phone: 'ZEILE-ROLLEN' }] }),
    )
    const wrapper = mount(SqlInspectorView)
    await flushPromises()
    await wrapper.find('select').setValue('users')
    await wrapper.find('select').setValue('roles')
    await flushPromises()

    finishFirst(makeTableData({ rows: [{ id: '1', phone: 'ZEILE-BENUTZER' }] }))
    await flushPromises()

    expect(wrapper.text()).toContain('ZEILE-ROLLEN')
    expect(wrapper.text()).not.toContain('ZEILE-BENUTZER')
  })
})
