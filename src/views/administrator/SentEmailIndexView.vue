<script setup lang="ts">
// 1:1 port of Legacy's Content/Administrator/SentEmails/Index.vue.
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSentEmails, type SentEmailShort } from '@/composables/useSentEmails'
import { useMonthQuery } from '@/composables/useMonthQuery'
import { formatUtcDateTime } from '@/services/dateFormat'
import MonthNavigator from '@/components/common/MonthNavigator.vue'

const router = useRouter()
const { listForMonth } = useSentEmails()
const { year, month } = useMonthQuery()

const emails = ref<SentEmailShort[]>([])

watch(
  [year, month],
  async ([currentYear, currentMonth]) => {
    emails.value = await listForMonth(currentYear, currentMonth)
  },
  { immediate: true },
)

function openShow(id: number): void {
  router.push({ name: 'administrator-sent-emails-show', params: { id } })
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Versandte Emails</h2>

  <MonthNavigator :year="year" :month="month" route-name="administrator-sent-emails-index" />

  <div v-if="emails.length" class="table-responsive">
    <table class="table table-striped">
      <tbody>
        <tr v-for="email in emails" :key="email.id" class="c-pointer" @click="openShow(email.id)">
          <td class="text-nowrap w-25">{{ formatUtcDateTime(email.datetime) }}</td>
          <td class="text-nowrap w-50">{{ email.to }}</td>
          <td class="text-nowrap w-25">{{ email.subject }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else class="text-center">Für diesen Monat wurden keine versandten Emails gefunden.</div>
</template>
