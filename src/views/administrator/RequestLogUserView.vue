<script setup lang="ts">
// Day+user-scoped detail page, adapted from Legacy's Content/Administrator/
// RequestLogs/IndexUser.vue -- Legacy only has month granularity (flat
// entry list grouped client-side by day); here the backend already scopes
// to exactly one day, so no client-side day-grouping is needed anymore
// (User decision 2026-08-12, real functional change).
import { ref, watch } from 'vue'
import { useRequestLogs, type RequestLogEntry } from '@/composables/useRequestLogs'
import { useDayQuery } from '@/composables/useDayQuery'
import { formatTimeOnly } from '@/services/dateFormat'

const props = defineProps<{ userId: string }>()
const { getForUser } = useRequestLogs()
const { year, month, day } = useDayQuery()

const username = ref('')
const entries = ref<RequestLogEntry[]>([])

// Vue Router reuses this component instance on a pure query-param change
// (a different day/user picked from the Index page's day groups) AND on a
// pure path-param change (:userId) -- onMounted() alone would only fire
// once, same bug precedent as CoreelementView.vue's
// watch(() => props.type, ...). userId is included in the watch sources
// for the same reason, not just year/month/day.
watch(
  [year, month, day, () => props.userId],
  async ([currentYear, currentMonth, currentDay, currentUserId]) => {
    const detail = await getForUser(Number(currentUserId), currentYear, currentMonth, currentDay)
    username.value = detail.username
    entries.value = detail.entries
  },
  { immediate: true },
)
</script>

<template>
  <h2 class="h2 text-center mb-4">Logbuch</h2>
  <p class="h4 text-center mb-4">{{ username }}</p>

  <div class="row justify-content-center mt-4">
    <div class="col-sm-10">
      <div class="text-center mb-4">
        <RouterLink
          class="btn btn-primary"
          :to="{ name: 'administrator-request-logs-index', query: { year, month, day } }"
        >
          zurück
        </RouterLink>
      </div>

      <div v-if="entries.length" class="table-responsive">
        <table class="table table-sm table-striped">
          <tbody>
            <tr v-for="entry in entries" :key="entry.id">
              <td class="text-nowrap">{{ formatTimeOnly(entry.created_at) }}</td>
              <td class="text-nowrap">{{ entry.request_method }}</td>
              <td class="text-nowrap">{{ entry.request_path }}</td>
              <td class="text-nowrap">
                <RouterLink
                  class="fas fa-magnifying-glass text-decoration-none"
                  :to="{ name: 'administrator-request-logs-show', params: { id: entry.id } }"
                  title="untersuchen"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-center">Für diesen Tag wurden keine Log-Einträge gefunden.</div>

      <div class="text-center my-4">
        <RouterLink
          class="btn btn-primary"
          :to="{ name: 'administrator-request-logs-index', query: { year, month, day } }"
        >
          zurück
        </RouterLink>
      </div>
    </div>
  </div>
</template>
