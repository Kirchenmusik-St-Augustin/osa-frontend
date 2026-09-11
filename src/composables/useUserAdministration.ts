import api from '@/services/api'

export interface UserAdministrationSearchResult {
  id: string
  label: string
}

export interface UserAdministrationDeletedEntry {
  id: string
  surname: string
  givenname: string
  email: string | null
}

export interface UserAdministrationDetail {
  id: string
  surname: string
  givenname: string
  email: string | null
  email_verified_at: string | null
  auth_locked: boolean
  deleted_at: string | null
  auth_lastsignal: string | null
}

export interface UserAdministrationActionResult {
  user: UserAdministrationDetail
  newpw: string | null
}

// UI-independent API layer for Schritt 7's Administrator-Benutzerverwaltung
// (restore/unlock/setPassword), mirrors useUsers.ts's shape. Unlike
// useUsers.ts, every read here operates withTrashed() -- 1:1 Legacy's
// UserAdministrationController.
export function useUserAdministration() {
  async function search(query: string): Promise<UserAdministrationSearchResult[]> {
    const response = await api.get<UserAdministrationSearchResult[]>(
      '/administrator/users/search',
      { params: { q: query } },
    )
    return response.data
  }

  async function listDeleted(): Promise<UserAdministrationDeletedEntry[]> {
    const response = await api.get<UserAdministrationDeletedEntry[]>('/administrator/users/deleted')
    return response.data
  }

  async function get(id: string): Promise<UserAdministrationActionResult> {
    const response = await api.get<UserAdministrationActionResult>(`/administrator/users/${id}`)
    return response.data
  }

  async function restore(id: string): Promise<UserAdministrationActionResult> {
    const response = await api.post<UserAdministrationActionResult>(
      `/administrator/users/${id}/restore`,
    )
    return response.data
  }

  async function unlock(id: string): Promise<UserAdministrationActionResult> {
    const response = await api.post<UserAdministrationActionResult>(
      `/administrator/users/${id}/unlock`,
    )
    return response.data
  }

  async function setPassword(id: string): Promise<UserAdministrationActionResult> {
    const response = await api.post<UserAdministrationActionResult>(
      `/administrator/users/${id}/set-password`,
    )
    return response.data
  }

  return { search, listDeleted, get, restore, unlock, setPassword }
}
