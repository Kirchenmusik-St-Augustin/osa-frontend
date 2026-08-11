import { ref } from 'vue'
import api from '@/services/api'

export interface Shorturl {
  id: number
  path: string
  target: string
  counter: number
  latestcall_at: string | null
}

export interface ShorturlPayload {
  path: string
  target: string
}

interface ShorturlListResponse {
  urlprefix: string
  items: Shorturl[]
}

// UI-independent API layer for the Shorturl admin page -- 1:1 structure of
// useFees.ts, plus `urlprefix` (server-built from Settings.shorturl_domain,
// see osa-backend's shorturl_service.list_shorturls_with_prefix) so dev vs.
// prod link prefixes never need hardcoding here either.
export function useShorturls() {
  const items = ref<Shorturl[]>([])
  const urlprefix = ref('')

  async function fetchList(): Promise<void> {
    const response = await api.get<ShorturlListResponse>('/shorturls')
    urlprefix.value = response.data.urlprefix
    items.value = response.data.items
  }

  async function save(id: number | null, payload: ShorturlPayload): Promise<void> {
    if (id === null) {
      await api.post<Shorturl>('/shorturls', payload)
    } else {
      await api.put<Shorturl>(`/shorturls/${id}`, payload)
    }
    await fetchList()
  }

  async function remove(id: number): Promise<void> {
    await api.delete(`/shorturls/${id}`)
    await fetchList()
  }

  return { items, urlprefix, fetchList, save, remove }
}
