import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSqlInspector } from '../useSqlInspector'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSqlInspector', () => {
  it('listTables requests the table-list endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: ['users', 'roles'] })
    const { listTables } = useSqlInspector()

    const result = await listTables()

    expect(mockedApi.get).toHaveBeenCalledWith('/administrator/sql-inspector/tables')
    expect(result).toEqual(['users', 'roles'])
  })

  it('getTableData requests the table-data endpoint with page params', async () => {
    const tableData = {
      table_name: 'users',
      columns: [{ name: 'id', type: 'INTEGER', nullable: false, primary_key: true }],
      rows: [{ id: '1' }],
      total: 1,
      page: 2,
      page_size: 25,
    }
    mockedApi.get.mockResolvedValueOnce({ data: tableData })
    const { getTableData } = useSqlInspector()

    const result = await getTableData('users', 2, 25)

    expect(mockedApi.get).toHaveBeenCalledWith('/administrator/sql-inspector/tables/users', {
      params: { page: 2, page_size: 25 },
    })
    expect(result).toEqual(tableData)
  })
})
