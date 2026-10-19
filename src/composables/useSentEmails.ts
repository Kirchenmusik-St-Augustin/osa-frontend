import api from '@/services/api'
import { fetchAllPages } from '@/services/pagination'

export interface SentEmailShort {
  id: string
  datetime: string
  to: string | null
  subject: string | null
}

export interface SentEmailShow {
  id: string
  mailer: string | null
  datetime: string
  from: string | null
  to: string | null
  cc: string | null
  bcc: string | null
  subject: string | null
  body: string | null
}

// UI-independent API layer for the SentEmail log (admin audit viewer).
export function useSentEmails() {
  async function listForMonth(year: number, month: number): Promise<SentEmailShort[]> {
    return fetchAllPages<SentEmailShort>('/administrator/sent-emails', { year, month })
  }

  async function get(id: string): Promise<SentEmailShow> {
    const response = await api.get<SentEmailShow>(`/administrator/sent-emails/${id}`)
    return response.data
  }

  return { listForMonth, get }
}
