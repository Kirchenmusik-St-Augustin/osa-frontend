import { computed } from 'vue'
import { useRoute } from 'vue-router'

function toDayPart(value: unknown, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  return Number.isInteger(parsed) ? parsed : fallback
}

// Pure year/month/day route-query reader for RequestLogUserView.vue (day+
// user-scoped detail page). Day-granularity sibling of useMonthQuery.ts,
// kept fully separate -- PerformanceCalendarView/SentEmailIndexView stay
// month-scoped, only the Logbuch user-detail view needs day granularity
// (User decision 2026-08-12, real functional change, no Legacy pixel-
// parity requirement here). No navigator UI reads from this one -- day-
// level navigation happens via RequestLogIndexView.vue's CollapsibleSection
// day groups, not a dedicated day navigator component.
export function useDayQuery() {
  const route = useRoute()
  const now = new Date()
  const year = computed(() => toDayPart(route.query['year'], now.getFullYear()))
  const month = computed(() => toDayPart(route.query['month'], now.getMonth() + 1))
  const day = computed(() => toDayPart(route.query['day'], now.getDate()))
  return { year, month, day }
}
