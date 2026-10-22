<script setup lang="ts">
// Monthly list of sent mails.
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSentEmails, type SentEmailShort } from '@/composables/useSentEmails'
import { useLatestResult } from '@/composables/useLatestResult'
import { useMonthQuery } from '@/composables/useMonthQuery'
import { extractApiErrors } from '@/services/apiErrors'
import { showToast } from '@/services/notifications'
import { formatUtcDateTime } from '@/services/dateFormat'
import MonthNavigator from '@/components/common/MonthNavigator.vue'

const router = useRouter()
const { listForMonth } = useSentEmails()
const { year, month } = useMonthQuery()

const applyLatest = useLatestResult()

const emails = ref<SentEmailShort[]>([])
const loadFailed = ref(false)

watch(
  [year, month],
  async ([currentYear, currentMonth]) => {
    try {
      await applyLatest(
        () => listForMonth(currentYear, currentMonth),
        (list) => {
          emails.value = list
          loadFailed.value = false
        },
      )
    } catch (error) {
      // Neither the mails of another month nor "no mails" may stand for a
      // month that could not be loaded.
      emails.value = []
      loadFailed.value = true
      showToast(
        extractApiErrors(error).generalError ?? 'Die Emails konnten nicht geladen werden.',
        true,
      )
    }
  },
  { immediate: true },
)

function openShow(id: string): void {
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
          <td class="text-nowrap w-25">
            <RouterLink
              :to="{ name: 'administrator-sent-emails-show', params: { id: email.id } }"
              class="text-decoration-none"
              @click.stop
              >{{ formatUtcDateTime(email.datetime) }}</RouterLink
            >
          </td>
          <td class="text-nowrap w-50">{{ email.to }}</td>
          <td class="text-nowrap w-25">{{ email.subject }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else-if="!loadFailed" class="text-center">
    Für diesen Monat wurden keine versandten Emails gefunden.
  </div>
</template>
