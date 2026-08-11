import { computed } from 'vue'
import { useRoute } from 'vue-router'

function toMonthPart(value: unknown, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  return Number.isInteger(parsed) ? parsed : fallback
}

// Shared year/month-from-route-query parsing -- extracted (Schritt 9) once a
// second real caller (SentEmailIndexView/RequestLogIndexView, alongside the
// original PerformanceCalendarView) needed the exact same "default to the
// current month when the query param is missing or not a valid integer"
// logic (AHA principle: 2nd real use reached, same bar as MonthNavigator.vue
// and UserDataCard.vue before it).
export function useMonthQuery() {
  const route = useRoute()
  const now = new Date()
  const year = computed(() => toMonthPart(route.query['year'], now.getFullYear()))
  const month = computed(() => toMonthPart(route.query['month'], now.getMonth() + 1))
  return { year, month }
}
