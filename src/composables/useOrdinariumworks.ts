import api from '@/services/api'
import type { AvailablePosition, PositionEntry, PositionInput } from '@/composables/usePerformances'

// Same shapes as the performance setup (usePerformances.ts owns them).
export type { AvailablePosition, PositionEntry, PositionInput }

export interface Ordinariumwork {
  id: string
  name: string
  description: string | null
  artist_id: string
  artist_name: string
  duration: number | null
  demanding: boolean
}

export interface OrdinariumworkSearchResult {
  id: string
  label: string
}

export interface AvailablePositions {
  instruments: AvailablePosition[]
  voices: AvailablePosition[]
}

export interface OrdinariumworkSetup {
  instruments: PositionEntry[]
  voices: PositionEntry[]
}

export interface OrdinariumworkSetupInput {
  instruments: PositionInput[]
  voices: PositionInput[]
}

export interface OrdinariumworkPayload {
  name: string
  description: string | null
  artist_id: string
  duration: number | null
  demanding: boolean
  setup: OrdinariumworkSetupInput
}

// UI-independent API layer for the Ordinariumwork domain -- mirrors
// useCoreelements.ts/useArtists.ts's shape. API calls must be extracted
// into testable TypeScript composables.
export function useOrdinariumworks() {
  async function search(query: string): Promise<OrdinariumworkSearchResult[]> {
    const response = await api.get<OrdinariumworkSearchResult[]>('/ordinariumworks/search', {
      params: { q: query },
    })
    return response.data
  }

  async function get(id: string): Promise<Ordinariumwork> {
    const response = await api.get<Ordinariumwork>(`/ordinariumworks/${id}`)
    return response.data
  }

  async function getSetup(id: string): Promise<OrdinariumworkSetup> {
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

  async function update(id: string, payload: OrdinariumworkPayload): Promise<Ordinariumwork> {
    const response = await api.put<Ordinariumwork>(`/ordinariumworks/${id}`, payload)
    return response.data
  }

  async function remove(id: string): Promise<void> {
    await api.delete(`/ordinariumworks/${id}`)
  }

  return { search, get, getSetup, getAvailablePositions, create, update, remove }
}
