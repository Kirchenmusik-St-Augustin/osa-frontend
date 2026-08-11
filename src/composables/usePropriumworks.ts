import api from '@/services/api'

export interface Propriumwork {
  id: number
  name: string
  description: string | null
  artist_id: number
  artist_name: string
  duration: number | null
  demanding: boolean
}

export interface PropriumworkSearchResult {
  id: number
  label: string
}

export interface PropriumworkPayload {
  name: string
  description: string | null
  artist_id: number
  duration: number | null
  demanding: boolean
}

// UI-independent API layer for the Propriumwork domain, Schritt 4/
// Repertoire -- structurally a subset of useOrdinariumworks.ts (no setup/
// positions concept at all, mirrors the backend 1:1).
export function usePropriumworks() {
  async function search(query: string): Promise<PropriumworkSearchResult[]> {
    const response = await api.get<PropriumworkSearchResult[]>('/propriumworks/search', {
      params: { q: query },
    })
    return response.data
  }

  async function get(id: number): Promise<Propriumwork> {
    const response = await api.get<Propriumwork>(`/propriumworks/${id}`)
    return response.data
  }

  async function create(payload: PropriumworkPayload): Promise<Propriumwork> {
    const response = await api.post<Propriumwork>('/propriumworks', payload)
    return response.data
  }

  async function update(id: number, payload: PropriumworkPayload): Promise<Propriumwork> {
    const response = await api.put<Propriumwork>(`/propriumworks/${id}`, payload)
    return response.data
  }

  async function remove(id: number): Promise<void> {
    await api.delete(`/propriumworks/${id}`)
  }

  return { search, get, create, update, remove }
}
