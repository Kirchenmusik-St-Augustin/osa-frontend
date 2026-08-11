import api from '@/services/api'

export interface Artist {
  id: number
  surname: string
  givenname: string
  description: string | null
  birthyear: number | null
  deathyear: number | null
  composer: boolean
  conductor: boolean
}

export interface ArtistSearchResult {
  id: number
  label: string
}

export interface ArtistPayload {
  surname: string
  givenname: string
  description: string | null
  birthyear: number | null
  deathyear: number | null
  composer: boolean
  conductor: boolean
}

// UI-independent API layer for the Artist (composers/conductors) domain,
// Schritt 4/Repertoire -- mirrors useCoreelements.ts's shape (CLAUDE.md:
// API calls must be extracted into testable TypeScript composables).
export function useArtists() {
  async function search(query: string): Promise<ArtistSearchResult[]> {
    const response = await api.get<ArtistSearchResult[]>('/artists/search', {
      params: { q: query },
    })
    return response.data
  }

  async function listComposers(): Promise<ArtistSearchResult[]> {
    const response = await api.get<ArtistSearchResult[]>('/artists/composers')
    return response.data
  }

  async function get(id: number): Promise<Artist> {
    const response = await api.get<Artist>(`/artists/${id}`)
    return response.data
  }

  async function create(payload: ArtistPayload): Promise<Artist> {
    const response = await api.post<Artist>('/artists', payload)
    return response.data
  }

  async function update(id: number, payload: ArtistPayload): Promise<Artist> {
    const response = await api.put<Artist>(`/artists/${id}`, payload)
    return response.data
  }

  async function remove(id: number): Promise<void> {
    await api.delete(`/artists/${id}`)
  }

  return { search, listComposers, get, create, update, remove }
}
