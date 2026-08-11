import { ref } from 'vue'
import api from '@/services/api'

export interface Fee {
  id: number
  name: string
  amount: number
}

export interface FeePayload {
  name: string
  amount: number
}

// UI-independent API layer for the Fee admin page -- 1:1 structure of
// useCoreelements.ts, but without move() (fees have no `order` column, see
// app/db/models/fee.py's docstring: administered through its own dedicated
// Legacy controller, not the generic Coreelement mechanism).
export function useFees() {
  const items = ref<Fee[]>([])

  async function fetchList(): Promise<void> {
    const response = await api.get<Fee[]>('/fees')
    items.value = response.data
  }

  async function save(id: number | null, payload: FeePayload): Promise<void> {
    if (id === null) {
      await api.post<Fee>('/fees', payload)
    } else {
      await api.put<Fee>(`/fees/${id}`, payload)
    }
    await fetchList()
  }

  async function remove(id: number): Promise<void> {
    await api.delete(`/fees/${id}`)
    await fetchList()
  }

  return { items, fetchList, save, remove }
}
