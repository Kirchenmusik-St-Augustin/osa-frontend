import api from '@/services/api'

export interface SentEmailShort {
  id: number
  datetime: string
  to: string | null
  subject: string | null
}

export interface SentEmailShow {
  id: number
  mailer: string | null
  datetime: string
  from: string | null
  to: string | null
  cc: string | null
  bcc: string | null
  subject: string | null
  body: string | null
}

// UI-independent API layer for Schritt 9's SentEmail-Log (Admin-/Audit-Viewer).
export function useSentEmails() {
  async function listForMonth(year: number, month: number): Promise<SentEmailShort[]> {
    const response = await api.get<SentEmailShort[]>('/administrator/sent-emails', {
      params: { year, month },
    })
    return response.data
  }

  async function get(id: number): Promise<SentEmailShow> {
    const response = await api.get<SentEmailShow>(`/administrator/sent-emails/${id}`)
    return response.data
  }

  return { listForMonth, get }
}
