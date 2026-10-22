import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { parseQueryInt } from '@/services/routeQuery'
// Pure year/month/day route-query reader for RequestLogUserView.vue (day+
// user-scoped detail page). Day-granularity sibling of useMonthQuery.ts,
// kept fully separate -- PerformanceCalendarView/SentEmailIndexView stay
// month-scoped, only the Logbuch user-detail view needs day granularity.
// No navigator UI reads from this one -- day-
// level navigation happens via RequestLogIndexView.vue's CollapsibleSection
// day groups, not a dedicated day navigator component.
export function useDayQuery() {
  const route = useRoute()
  const now = new Date()
  const year = computed(() => parseQueryInt(route.query['year'], now.getFullYear(), 1900, 2999))
  const month = computed(() => parseQueryInt(route.query['month'], now.getMonth() + 1, 1, 12))
  const day = computed(() => parseQueryInt(route.query['day'], now.getDate(), 1, 31))
  return { year, month, day }
}
