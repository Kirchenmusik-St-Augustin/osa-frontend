<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePerformances, type PerformanceCalendarItem } from '@/composables/usePerformances'
import { useBookings } from '@/composables/useBookings'
import { useLatestResult } from '@/composables/useLatestResult'
import { useMonthQuery } from '@/composables/useMonthQuery'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'
import PerformanceCard from '@/components/performances/PerformanceCard.vue'
import MonthNavigator from '@/components/common/MonthNavigator.vue'

// The de-facto app home ('/' shows this calendar) -- there is no separate
// "Kalender" nav entry.
const authStore = useAuthStore()
const { listForMonth } = usePerformances()
const { changeBookingStatus } = useBookings()
const { year, month } = useMonthQuery()

const performances = ref<PerformanceCalendarItem[]>([])
const loadFailed = ref(false)
const applyLatest = useLatestResult()

// Month arrows clicked faster than the server answers: only the newest
// month is shown, and a failed load says so instead of showing "no
// performances".
async function loadMonth(): Promise<void> {
  try {
    await applyLatest(
      () => listForMonth(year.value, month.value),
      (list) => {
        performances.value = list
        loadFailed.value = false
      },
    )
  } catch (error) {
    performances.value = []
    loadFailed.value = true
    showToast(
      extractApiErrors(error).generalError ?? 'Der Kalender konnte nicht geladen werden.',
      true,
    )
  }
}

watch([year, month], loadMonth, { immediate: true })

// The self-service trigger mutates the CURRENT user's status on the
// backend, computing the actual transition itself (no client-sent target
// status, see useBookings.ts's changeBookingStatus() docstring) -- a full
// list refresh afterward reloads every card's `user_booking` in one go.
async function handleChangeStatus(performanceId: string): Promise<void> {
  const confirmed = await confirmAction()
  if (!confirmed) return

  try {
    await changeBookingStatus(performanceId)
    await loadMonth()
  } catch {
    showToast('Ein unerwarteter Fehler ist aufgetreten.', true)
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Kalender</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-md-8 justify-content-center">
      <MonthNavigator :year="year" :month="month" route-name="home" />

      <div v-if="authStore.hasPermission('performanceMaintain')" class="text-center mb-4">
        <RouterLink
          class="btn btn-primary mb-3"
          :to="{ name: 'performances-create', query: { year, month } }"
        >
          Aufführung anlegen
        </RouterLink>
      </div>

      <div v-if="performances.length">
        <PerformanceCard
          v-for="performance in performances"
          :key="performance.id"
          :performance="performance"
          show-menu
          booking-trigger
          init-show-rehearsals
          @change-status="handleChangeStatus(performance.id)"
        />
      </div>
      <div v-else-if="!loadFailed" class="text-center">
        Für diesen Monat sind keine Aufführungen geplant.
      </div>
    </div>
  </div>
</template>
