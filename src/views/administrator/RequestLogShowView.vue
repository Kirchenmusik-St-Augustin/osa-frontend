<script setup lang="ts">
// 1:1 port of Legacy's Content/Administrator/RequestLogs/Show.vue
// (LogDetail field list).
import { computed, onMounted, ref } from 'vue'
import { useRequestLogs, type RequestLogShow } from '@/composables/useRequestLogs'
import { formatUtcDateTime } from '@/services/dateFormat'
import JsonBlock from '@/components/common/JsonBlock.vue'

const props = defineProps<{ id: string }>()
const { get } = useRequestLogs()

const entry = ref<RequestLogShow | null>(null)

onMounted(async () => {
  entry.value = await get(Number(props.id))
})

// Legacy's "zurück" returns to IndexUser for the month/user the entry's
// own created_at/user_id belong to -- not necessarily "now" or the
// currently logged-in admin.
const backTarget = computed(() => {
  if (!entry.value || entry.value.user_id === null) {
    return { name: 'administrator-request-logs-index' as const }
  }
  const at = new Date(entry.value.created_at)
  return {
    name: 'administrator-request-logs-user' as const,
    params: { userId: entry.value.user_id },
    query: { year: at.getFullYear(), month: at.getMonth() + 1 },
  }
})
</script>

<template>
  <h2 class="h2 text-center mb-4">Logbuch</h2>
  <p class="h4 text-center mb-4">Log-Details</p>

  <div v-if="entry" class="row justify-content-center mt-4">
    <div class="col-sm-8">
      <div class="text-center mb-4">
        <RouterLink class="btn btn-primary" :to="backTarget">zurück</RouterLink>
      </div>

      <div class="mb-2">
        <div class="fw-bold">Zeitpunkt:</div>
        <div class="ps-2">{{ formatUtcDateTime(entry.created_at) }}</div>
      </div>
      <div class="mb-2">
        <div class="fw-bold">Benutzerkonto:</div>
        <div class="ps-2">{{ entry.user_name }} (ID: {{ entry.user_id }})</div>
      </div>
      <div class="mb-2">
        <div class="fw-bold">IP-Adresse:</div>
        <div class="ps-2">{{ entry.client_ip }} ({{ entry.client_ips.join(' / ') }})</div>
      </div>
      <div class="mb-2">
        <div class="fw-bold">User-Agent:</div>
        <div class="ps-2">{{ entry.client_user_agent_string }}</div>
      </div>
      <div class="mb-2">
        <div class="fw-bold">Anfrage-Methode:</div>
        <div class="ps-2">{{ entry.request_method }}</div>
      </div>
      <div class="mb-2">
        <div class="fw-bold">Anfrage-Pfad:</div>
        <div class="ps-2">{{ entry.request_path }}</div>
      </div>
      <div class="mb-2">
        <div class="fw-bold">Anfrage-Daten:</div>
        <div class="ps-2"><JsonBlock :value="entry.request_input" /></div>
      </div>
      <div class="mb-2">
        <div class="fw-bold">Antwort-Status:</div>
        <div class="ps-2">{{ entry.response_status }}</div>
      </div>
      <div class="mb-2">
        <div class="fw-bold">Antwort-Daten:</div>
        <div class="ps-2"><JsonBlock :value="entry.response_content ?? []" /></div>
      </div>
      <div class="mb-2">
        <div class="fw-bold">Benötigter Speicher:</div>
        <div class="ps-2">{{ entry.memory_usage }} Bytes</div>
      </div>

      <div class="text-center my-4">
        <RouterLink class="btn btn-primary" :to="backTarget">zurück</RouterLink>
      </div>
    </div>
  </div>
</template>
