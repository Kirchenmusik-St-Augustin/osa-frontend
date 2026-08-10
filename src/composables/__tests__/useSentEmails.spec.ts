import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSentEmails } from '../useSentEmails'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSentEmails', () => {
  it('listForMonth requests the month-scoped endpoint', async () => {
    const entries = [{ id: 1, datetime: '2026-08-01T10:00:00Z', to: 'a@b.test', subject: 'X' }]
    mockedApi.get.mockResolvedValueOnce({ data: entries })
    const { listForMonth } = useSentEmails()

    const result = await listForMonth(2026, 8)

    expect(mockedApi.get).toHaveBeenCalledWith('/administrator/sent-emails', {
      params: { year: 2026, month: 8 },
    })
    expect(result).toEqual(entries)
  })

  it('get requests the sent email by id', async () => {
    const email = {
      id: 1,
      mailer: 'smtp',
      datetime: '2026-08-01T10:00:00Z',
      from: 'noreply@example.test',
      to: 'a@b.test',
      cc: null,
      bcc: null,
      subject: 'X',
      body: '<p>Hi</p>',
    }
    mockedApi.get.mockResolvedValueOnce({ data: email })
    const { get } = useSentEmails()

    const result = await get(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/administrator/sent-emails/1')
    expect(result).toEqual(email)
  })
})
