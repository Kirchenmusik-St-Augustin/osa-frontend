import api from '@/services/api'
import type { PerformanceShortBase } from '@/composables/useBookings'

export interface RoleRef {
  id: number
  name: string
  label: string
}

export interface Oauth2Binding {
  id: number
  provider: string
  remote_name: string
}

export interface PositionRef {
  id: number
  name: string
}

export interface UserSearchResult {
  id: number
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
  id: number
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
  instruments: number[]
  voices: number[]
  choirjobs: number[]
  roles: number[]
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

  async function get(id: number): Promise<User> {
    const response = await api.get<User>(`/users/${id}`)
    return response.data
  }

  async function create(payload: UserPayload): Promise<User> {
    const response = await api.post<User>('/users', payload)
    return response.data
  }

  async function update(id: number, payload: UserPayload): Promise<User> {
    const response = await api.put<User>(`/users/${id}`, payload)
    return response.data
  }

  async function remove(id: number): Promise<void> {
    await api.delete(`/users/${id}`)
  }

  // Admin-side counterpart to useSupport.ts's getMyRequestsAndBookings --
  // same backend function, scoped to an arbitrary user id (Legacy's
  // "Anfragen und Buchungen für dieses Konto einsehen" link on the Show
  // page).
  async function getRequestsAndBookings(id: number): Promise<PerformanceShortBase[]> {
    const response = await api.get<PerformanceShortBase[]>(`/users/${id}/requests-and-bookings`)
    return response.data
  }

  return { search, getFormOptions, get, create, update, remove, getRequestsAndBookings }
}
