import api from '@/services/api'

export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// The largest page the API hands out (an unbounded request is refused).
export const PAGE_SIZE = 500

// The list endpoints answer in pages. The screens show a whole list, so this
// reads page after page until every row of the result has arrived: a list
// that outgrows one page is never cut off.
export async function fetchAllPages<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  const items: T[] = []
  for (;;) {
    const response = await api.get<Page<T>>(path, {
      params: { ...params, limit: PAGE_SIZE, offset: items.length },
    })
    items.push(...response.data.items)
    // An empty page ends the loop even if the total claims more rows, so a
    // result that shrank in the meantime cannot keep it running.
    if (response.data.items.length === 0 || items.length >= response.data.total) return items
  }
}
