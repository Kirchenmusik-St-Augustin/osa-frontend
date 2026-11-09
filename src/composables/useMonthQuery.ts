import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { parseQueryInt } from '@/services/routeQuery'

// Shared year/month-from-route-query parsing for the calendar and the
// month-based admin lists (SentEmailIndexView/RequestLogIndexView): defaults
// to the current month when the query param is missing, not a plain integer
// or outside the valid range.
export function useMonthQuery() {
  const route = useRoute()
  const now = new Date()
  const year = computed(() => parseQueryInt(route.query['year'], now.getFullYear(), 1900, 2999))
  const month = computed(() => parseQueryInt(route.query['month'], now.getMonth() + 1, 1, 12))
  return { year, month }
}
