import api from '@/services/api'

export interface Ordinariumwork {
  id: number
  name: string
  description: string | null
  artist_id: number
  artist_name: string
  duration: number | null
  demanding: boolean
}

export interface OrdinariumworkSearchResult {
  id: number
  label: string
}

export interface AvailablePosition {
  id: number
  name: string
}

export interface AvailablePositions {
  instruments: AvailablePosition[]
  voices: AvailablePosition[]
}

export interface PositionEntry {
  id: number
  name: string
  quantity: number
}

export interface OrdinariumworkSetup {
  instruments: PositionEntry[]
  voices: PositionEntry[]
}

export interface PositionInput {
  id: number
  quantity: number
}

export interface OrdinariumworkSetupInput {
  instruments: PositionInput[]
  voices: PositionInput[]
}

export interface OrdinariumworkPayload {
  name: string
  description: string | null
  artist_id: number
  duration: number | null
  demanding: boolean
  setup: OrdinariumworkSetupInput
}

// UI-independent API layer for the Ordinariumwork domain, Schritt 4/
// Repertoire -- mirrors useCoreelements.ts/useArtists.ts's shape (CLAUDE.md:
// API calls must be extracted into testable TypeScript composables).
export function useOrdinariumworks() {
  async function search(query: string): Promise<OrdinariumworkSearchResult[]> {
    const response = await api.get<OrdinariumworkSearchResult[]>('/ordinariumworks/search', {
      params: { q: query },
    })
    return response.data
  }

  async function get(id: number): Promise<Ordinariumwork> {
    const response = await api.get<Ordinariumwork>(`/ordinariumworks/${id}`)
    return response.data
  }

  async function getSetup(id: number): Promise<OrdinariumworkSetup> {
    const response = await api.get<OrdinariumworkSetup>(`/ordinariumworks/${id}/setup`)
    return response.data
  }

  async function getAvailablePositions(): Promise<AvailablePositions> {
    const response = await api.get<AvailablePositions>('/ordinariumworks/available-positions')
    return response.data
  }

  async function create(payload: OrdinariumworkPayload): Promise<Ordinariumwork> {
    const response = await api.post<Ordinariumwork>('/ordinariumworks', payload)
    return response.data
  }

  async function update(id: number, payload: OrdinariumworkPayload): Promise<Ordinariumwork> {
    const response = await api.put<Ordinariumwork>(`/ordinariumworks/${id}`, payload)
    return response.data
  }

  async function remove(id: number): Promise<void> {
    await api.delete(`/ordinariumworks/${id}`)
  }

  return { search, get, getSetup, getAvailablePositions, create, update, remove }
}
