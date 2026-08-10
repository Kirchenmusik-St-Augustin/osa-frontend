import api from '@/services/api'

export interface DirectoryPositionRef {
  id: number
  name: string
}

export interface DirectoryAbilities {
  instruments: DirectoryPositionRef[]
  voices: DirectoryPositionRef[]
  choirjobs: DirectoryPositionRef[]
}

export interface DirectoryEntry {
  id: number
  surname: string
  givenname: string
  has_email: boolean
  email: string | null
  phone: string | null
}

export type DirectoryPositionType = 'instruments' | 'voices' | 'choirjobs'

// UI-independent API layer for Schritt 7's Benutzerverzeichnis (System),
// mirrors useUsers.ts's shape.
export function useUserdirectory() {
  async function getAbilities(): Promise<DirectoryAbilities> {
    const response = await api.get<DirectoryAbilities>('/userdirectory/abilities')
    return response.data
  }

  async function listUsers(
    type: 'all' | DirectoryPositionType,
    id: number | null,
  ): Promise<DirectoryEntry[]> {
    const params: Record<string, string | number> = { type }
    if (id !== null) params['id'] = id
    const response = await api.get<DirectoryEntry[]>('/userdirectory', { params })
    return response.data
  }

  return { getAbilities, listUsers }
}
