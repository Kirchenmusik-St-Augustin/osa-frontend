import { PAGE_SIZE, type Page } from '@/services/pagination'

/** The API's answer for a list that fits on one page. */
export const pageOf = <T>(items: T[], total: number = items.length): Page<T> => ({
  items,
  total,
  limit: PAGE_SIZE,
  offset: 0,
})

/** The request options of the first page, with the endpoint's own query parameters. */
export const firstPageRequest = (params: Record<string, string | number> = {}) => ({
  params: { ...params, limit: PAGE_SIZE, offset: 0 },
})
