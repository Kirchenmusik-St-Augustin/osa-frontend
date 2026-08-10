<script setup lang="ts">
// 1:1 port of Legacy's Content/Administrator/RequestLogs/Index.vue.
import { ref, watch } from 'vue'
import { useRequestLogs, type RequestLogUserSummary } from '@/composables/useRequestLogs'
import { useMonthQuery } from '@/composables/useMonthQuery'
import MonthNavigator from '@/components/common/MonthNavigator.vue'

const { listUsersForMonth } = useRequestLogs()
const { year, month } = useMonthQuery()

const users = ref<RequestLogUserSummary[]>([])

watch(
  [year, month],
  async ([currentYear, currentMonth]) => {
    users.value = await listUsersForMonth(currentYear, currentMonth)
  },
  { immediate: true },
)
</script>

<template>
  <h2 class="h2 text-center mb-4">Logbuch</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-sm-5">
      <MonthNavigator :year="year" :month="month" route-name="administrator-request-logs-index" />

      <div v-if="users.length" class="table-responsive">
        <table class="table table-sm table-striped">
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                <RouterLink
                  class="text-decoration-none"
                  :to="{
                    name: 'administrator-request-logs-user',
                    params: { userId: user.id },
                    query: { year, month },
                  }"
                >
                  <div>{{ user.label }}</div>
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-center">Für diesen Monat wurden keine Log-Einträge gefunden.</div>
    </div>
  </div>
</template>
