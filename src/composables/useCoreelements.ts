import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import api from '@/services/api'
import type { CoreelementType } from '@/constants/coreelementTypes'

export interface Coreelement {
  id: number
  name: string
  order: number
  label: string | null
  description: string | null
  address: string | null
  color: string | null
}

export interface CoreelementPayload {
  name: string
  label?: string
  description?: string
  address?: string
  color?: string
}

// UI-independent API layer for the generic Coreelement admin pages (CLAUDE.md:
// API calls must be extracted into testable TypeScript composables).
// `type` accepts a plain value OR a ref/getter -- Vue Router
// reuses the same CoreelementView instance across navigations between two
// `administrator-coreelement` routes (only the `:type` param changes), so
// a plain string captured once at setup time would silently keep pointing
// at the FIRST type forever. `toValue()` re-reads it on every call instead.
export function useCoreelements(type: MaybeRefOrGetter<CoreelementType>) {
  const items = ref<Coreelement[]>([])

  function basePath(): string {
    return `/coreelements/${toValue(type)}`
  }

  async function fetchList(): Promise<void> {
    const response = await api.get<Coreelement[]>(basePath())
    items.value = response.data
  }

  async function save(id: number | null, payload: CoreelementPayload): Promise<void> {
    if (id === null) {
      await api.post<Coreelement>(basePath(), payload)
    } else {
      await api.put<Coreelement>(`${basePath()}/${id}`, payload)
    }
    await fetchList()
  }

  async function remove(id: number): Promise<void> {
    await api.delete(`${basePath()}/${id}`)
    await fetchList()
  }

  async function move(id: number, direction: 'up' | 'down'): Promise<void> {
    const response = await api.post<Coreelement[]>(`${basePath()}/${id}/move/${direction}`)
    items.value = response.data
  }

  return { items, fetchList, save, remove, move }
}
