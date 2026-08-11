import api from '@/services/api'

export interface ScoreFieldConfig {
  label: string | null
  kind: 'text' | 'textarea' | 'select' | 'number'
  length: number | null
  required: boolean
  values: string[] | null
}

export type ScoreFieldsPayload = Record<string, string | number>

export interface Score {
  id: number
  created_at: string | null
  updated_at: string | null
  fields: ScoreFieldsPayload
}

export interface ScoreSearchResult {
  id: number
  label: string
}

// UI-independent API layer for the Score (Notenarchiv) domain, Schritt 8 --
// mirrors useCoreelements.ts's shape. No remove() -- Legacy's own route
// registration excludes destroy entirely (see osa-backend's score.py
// router docstring), this domain has no delete concept at all.
export function useScores() {
  async function getFieldsConfig(): Promise<Record<string, ScoreFieldConfig>> {
    const response = await api.get<Record<string, ScoreFieldConfig>>('/scores/fields-config')
    return response.data
  }

  async function getDefaults(): Promise<ScoreFieldsPayload> {
    const response = await api.get<ScoreFieldsPayload>('/scores/defaults')
    return response.data
  }

  async function search(query: string): Promise<ScoreSearchResult[]> {
    const response = await api.get<ScoreSearchResult[]>('/scores/search', {
      params: { q: query },
    })
    return response.data
  }

  async function get(id: number): Promise<Score> {
    const response = await api.get<Score>(`/scores/${id}`)
    return response.data
  }

  async function create(payload: ScoreFieldsPayload): Promise<Score> {
    const response = await api.post<Score>('/scores', payload)
    return response.data
  }

  async function update(id: number, payload: ScoreFieldsPayload): Promise<Score> {
    const response = await api.put<Score>(`/scores/${id}`, payload)
    return response.data
  }

  return { getFieldsConfig, getDefaults, search, get, create, update }
}
