import api from '@/services/api'

export interface StatisticsEmail {
  active: boolean
  period_days: number
  threshold: number
  sent: number
}

export interface Statistics {
  users: number
  performances: number
  ordinariumworks: number
  propriumworks: number
  scores: number
  email: StatisticsEmail
}

// UI-independent API layer for the Statistiken page (admin audit viewer).
export function useStatistics() {
  async function get(): Promise<Statistics> {
    const response = await api.get<Statistics>('/statistics')
    return response.data
  }

  return { get }
}
