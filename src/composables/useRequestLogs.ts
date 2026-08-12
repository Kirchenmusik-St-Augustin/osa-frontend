import api from '@/services/api'

export interface RequestLogUserSummary {
  id: number
  label: string
}

export interface RequestLogDayGroup {
  day: string // Pydantic `date`, serialized as "YYYY-MM-DD"
  users: RequestLogUserSummary[]
}

export interface RequestLogEntry {
  id: number
  created_at: string
  request_method: string
  request_path: string
}

export interface RequestLogUserDetail {
  username: string
  entries: RequestLogEntry[]
}

export interface RequestLogShow {
  id: number
  client_ip: string
  client_ips: string[]
  client_user_agent_string: string | null
  user_id: number | null
  user_name: string | null
  request_method: string
  request_path: string
  request_input: unknown
  response_status: number
  response_content: unknown
  memory_usage: number
  created_at: string
}

// UI-independent API layer for Schritt 9's RequestLog/Logbuch (Admin-/Audit-Viewer).
export function useRequestLogs() {
  async function listDaysWithUsersForMonth(
    year: number,
    month: number,
  ): Promise<RequestLogDayGroup[]> {
    const response = await api.get<RequestLogDayGroup[]>('/administrator/request-logs', {
      params: { year, month },
    })
    return response.data
  }

  async function getForUser(
    userId: number,
    year: number,
    month: number,
    day: number,
  ): Promise<RequestLogUserDetail> {
    const response = await api.get<RequestLogUserDetail>(
      `/administrator/request-logs/users/${userId}`,
      { params: { year, month, day } },
    )
    return response.data
  }

  async function get(id: number): Promise<RequestLogShow> {
    const response = await api.get<RequestLogShow>(`/administrator/request-logs/${id}`)
    return response.data
  }

  return { listDaysWithUsersForMonth, getForUser, get }
}
