<script setup lang="ts">
// 1:1 port of Legacy's Content/Administrator/RequestLogs/Index.vue, EXCEPT
// day-grouped instead of a flat user list (User decision 2026-08-12, real
// functional change -- Legacy only has month granularity, no pixel-parity
// requirement for this feature). Month selection itself (useMonthQuery/
// MonthNavigator) is untouched, shared with SentEmailIndexView/
// PerformanceCalendarView.
import { computed, ref, watch } from 'vue'
import { useRequestLogs, type RequestLogDayGroup } from '@/composables/useRequestLogs'
import { useMonthQuery } from '@/composables/useMonthQuery'
import MonthNavigator from '@/components/common/MonthNavigator.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import { formatDayMonthYear, parseCalendarDate } from '@/services/dateFormat'

const { listDaysWithUsersForMonth } = useRequestLogs()
const { year, month } = useMonthQuery()

const dayGroups = ref<RequestLogDayGroup[]>([])

watch(
  [year, month],
  async ([currentYear, currentMonth]) => {
    dayGroups.value = await listDaysWithUsersForMonth(currentYear, currentMonth)
  },
  { immediate: true },
)

// Pre-shapes day/title/dayNumber per group -- CLAUDE.md's "computed()
// instead of template logic" rule, kept out of the template entirely
// rather than calling parseCalendarDate()/formatDayMonthYear() per row
// inline.
const dayGroupsView = computed(() =>
  dayGroups.value.map((group) => {
    const { year: y, month: m, day: d } = parseCalendarDate(group.day)
    return { ...group, title: formatDayMonthYear(y, m, d), dayNumber: d }
  }),
)
</script>

<template>
  <h2 class="h2 text-center mb-4">Logbuch</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-sm-5">
      <MonthNavigator :year="year" :month="month" route-name="administrator-request-logs-index" />

      <div v-if="dayGroupsView.length">
        <CollapsibleSection
          v-for="group in dayGroupsView"
          :key="group.day"
          :title="group.title"
          hide-desc
          hide-border
        >
          <div class="table-responsive">
            <table class="table table-sm table-striped">
              <tbody>
                <tr v-for="user in group.users" :key="user.id">
                  <td>
                    <RouterLink
                      class="text-decoration-none"
                      :to="{
                        name: 'administrator-request-logs-user',
                        params: { userId: user.id },
                        query: { year, month, day: group.dayNumber },
                      }"
                    >
                      <div>{{ user.label }}</div>
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      </div>
      <div v-else class="text-center">Für diesen Monat wurden keine Log-Einträge gefunden.</div>
    </div>
  </div>
</template>
