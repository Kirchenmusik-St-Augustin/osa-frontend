import api from '@/services/api'
import type { PerformanceShortBase } from '@/composables/useBookings'

export interface RoleRef {
  id: string
  name: string
  label: string
}

export interface Oauth2Binding {
  id: string
  provider: string
  remote_name: string
}

export interface PositionRef {
  id: string
  name: string
}

export interface UserSearchResult {
  id: string
  label: string
}

export interface UserFormOptions {
  instruments: PositionRef[]
  voices: PositionRef[]
  choirjobs: PositionRef[]
  roles: RoleRef[]
}

// Covers both Show and the Edit-form's prefill -- 1:1 the backend's
// UserResponse (app/schemas/user.py), same pattern as useArtists.ts's
// Artist type.
export interface User {
  id: string
  surname: string
  givenname: string
  email: string | null
  email_verified_at: string | null
  phone: string | null
  auth_lastsignal: string | null
  auth_locked: boolean
  administrator: boolean
  deletable: boolean
  oauth2_bindings: Oauth2Binding[]
  instruments: PositionRef[]
  voices: PositionRef[]
  choirjobs: PositionRef[]
  roles: RoleRef[]
}

export interface UserPayload {
  givenname: string
  surname: string
  email: string | null
  phone: string | null
  auth_locked: boolean
  instruments: string[]
  voices: string[]
  choirjobs: string[]
  roles: string[]
  administrator: boolean
}

// UI-independent API layer for Schritt 7's Benutzerverwaltung (System),
// mirrors useArtists.ts's shape.
export function useUsers() {
  async function search(query: string): Promise<UserSearchResult[]> {
    const response = await api.get<UserSearchResult[]>('/users/search', {
      params: { q: query },
    })
    return response.data
  }

  async function getFormOptions(): Promise<UserFormOptions> {
    const response = await api.get<UserFormOptions>('/users/form-options')
    return response.data
  }

  async function get(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`)
    return response.data
  }

  async function create(payload: UserPayload): Promise<User> {
    const response = await api.post<User>('/users', payload)
    return response.data
  }

  async function update(id: string, payload: UserPayload): Promise<User> {
    const response = await api.put<User>(`/users/${id}`, payload)
    return response.data
  }

  async function remove(id: string): Promise<void> {
    await api.delete(`/users/${id}`)
  }

  // Admin-side counterpart to useSupport.ts's getMyRequestsAndBookings --
  // same backend function, scoped to an arbitrary user id (Legacy's
  // "Anfragen und Buchungen für dieses Konto einsehen" link on the Show
  // page).
  async function getRequestsAndBookings(id: string): Promise<PerformanceShortBase[]> {
    const response = await api.get<PerformanceShortBase[]>(`/users/${id}/requests-and-bookings`)
    return response.data
  }

  return { search, getFormOptions, get, create, update, remove, getRequestsAndBookings }
}
