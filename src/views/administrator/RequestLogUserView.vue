<script setup lang="ts">
// 1:1 port of Legacy's Content/Administrator/RequestLogs/IndexUser.vue.
import { computed, onMounted, ref } from 'vue'
import { useRequestLogs, type RequestLogEntry } from '@/composables/useRequestLogs'
import { useMonthQuery } from '@/composables/useMonthQuery'
import { formatDateOnly, formatTimeOnly } from '@/services/dateFormat'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'

const props = defineProps<{ userId: string }>()
const { getForUser } = useRequestLogs()
const { year, month } = useMonthQuery()

const username = ref('')
const entries = ref<RequestLogEntry[]>([])

onMounted(async () => {
  const detail = await getForUser(Number(props.userId), year.value, month.value)
  username.value = detail.username
  entries.value = detail.entries
})

// Groups entries by calendar day, preserving the already-ascending order
// from the backend within each group (1:1 Legacy's lodash groupBy over
// moment(created_at).format('LL')) -- native Object.groupBy-equivalent, no
// lodash dependency for a single call. Each CollapsibleSection below starts
// collapsed (no initShow prop) -- Legacy's own <toggler> defaults closed too.
const groupedByDay = computed(() => {
  const groups = new Map<string, RequestLogEntry[]>()
  for (const entry of entries.value) {
    const key = formatDateOnly(entry.created_at)
    const group = groups.get(key)
    if (group) {
      group.push(entry)
    } else {
      groups.set(key, [entry])
    }
  }
  return groups
})
</script>

<template>
  <h2 class="h2 text-center mb-4">Logbuch</h2>
  <p class="h4 text-center mb-4">{{ username }}</p>

  <div class="row justify-content-center mt-4">
    <div class="col-sm-10">
      <div class="text-center mb-4">
        <RouterLink
          class="btn btn-primary"
          :to="{ name: 'administrator-request-logs-index', query: { year, month } }"
        >
          zurück
        </RouterLink>
      </div>

      <div v-if="entries.length">
        <CollapsibleSection
          v-for="[day, dayEntries] in groupedByDay"
          :key="day"
          :title="day"
          hide-desc
          hide-border
        >
          <div class="table-responsive">
            <table class="table table-sm table-striped">
              <tbody>
                <tr v-for="entry in dayEntries" :key="entry.id">
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
        </CollapsibleSection>
      </div>
      <div v-else class="text-center">Für diesen Monat wurden keine Log-Einträge gefunden.</div>

      <div class="text-center my-4">
        <RouterLink
          class="btn btn-primary"
          :to="{ name: 'administrator-request-logs-index', query: { year, month } }"
        >
          zurück
        </RouterLink>
      </div>
    </div>
  </div>
</template>
