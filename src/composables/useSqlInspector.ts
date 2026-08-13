import api from '@/services/api'

export interface TableColumn {
  name: string
  type: string
  nullable: boolean
  primary_key: boolean
}

export interface TableData {
  table_name: string
  columns: TableColumn[]
  rows: Record<string, string | null>[]
  total: number
  page: number
  page_size: number
}

// UI-independent API layer for the admin-only "SQL-Einsicht" table browser
// (GET /administrator/sql-inspector/*) -- a read-only schema/table viewer,
// not a free-text SQL console: the only identifier-like input is a table
// name, always validated backend-side against a live schema allowlist.
export function useSqlInspector() {
  async function listTables(): Promise<string[]> {
    const response = await api.get<string[]>('/administrator/sql-inspector/tables')
    return response.data
  }

  async function getTableData(
    tableName: string,
    page: number,
    pageSize: number,
  ): Promise<TableData> {
    const response = await api.get<TableData>(`/administrator/sql-inspector/tables/${tableName}`, {
      params: { page, page_size: pageSize },
    })
    return response.data
  }

  return { listTables, getTableData }
}
