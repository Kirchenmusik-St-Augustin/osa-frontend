import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRequestLogs } from '../useRequestLogs'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useRequestLogs', () => {
  it('listUsersForMonth requests the month-scoped endpoint', async () => {
    const users = [{ id: 1, label: 'SCHINDLER, Margot' }]
    mockedApi.get.mockResolvedValueOnce({ data: users })
    const { listUsersForMonth } = useRequestLogs()

    const result = await listUsersForMonth(2026, 8)

    expect(mockedApi.get).toHaveBeenCalledWith('/administrator/request-logs', {
      params: { year: 2026, month: 8 },
    })
    expect(result).toEqual(users)
  })

  it('getForUser requests the user-scoped entries endpoint', async () => {
    const detail = { username: 'SCHINDLER, Margot', entries: [] }
    mockedApi.get.mockResolvedValueOnce({ data: detail })
    const { getForUser } = useRequestLogs()

    const result = await getForUser(1, 2026, 8)

    expect(mockedApi.get).toHaveBeenCalledWith('/administrator/request-logs/users/1', {
      params: { year: 2026, month: 8 },
    })
    expect(result).toEqual(detail)
  })

  it('get requests the entry by id', async () => {
    const entry = {
      id: 1,
      client_ip: '127.0.0.1',
      client_ips: ['127.0.0.1'],
      client_user_agent_string: null,
      user_id: null,
      user_name: null,
      request_method: 'GET',
      request_path: '/some/path',
      request_input: {},
      response_status: 200,
      response_content: null,
      memory_usage: 1,
      created_at: '2026-08-02T11:00:00+00:00',
    }
    mockedApi.get.mockResolvedValueOnce({ data: entry })
    const { get } = useRequestLogs()

    const result = await get(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/administrator/request-logs/1')
    expect(result).toEqual(entry)
  })
})
