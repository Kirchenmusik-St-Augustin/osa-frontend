<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePerformances, type PerformanceCalendarItem } from '@/composables/usePerformances'
import { useBookings } from '@/composables/useBookings'
import { useMonthQuery } from '@/composables/useMonthQuery'
import { confirmAction, showToast } from '@/services/notifications'
import PerformanceCard from '@/components/performances/PerformanceCard.vue'
import MonthNavigator from '@/components/common/MonthNavigator.vue'

// The de-facto app home (Legacy redirects '/' to the performances calendar,
// see routes/web.php `Route::redirect('/', 'content/music/performances')`)
// -- there is no separate "Kalender" nav entry anywhere in Legacy either.
const authStore = useAuthStore()
const { listForMonth } = usePerformances()
const { changeBookingStatus } = useBookings()
const { year, month } = useMonthQuery()

const performances = ref<PerformanceCalendarItem[]>([])

watch(
  [year, month],
  async ([currentYear, currentMonth]) => {
    performances.value = await listForMonth(currentYear, currentMonth)
  },
  { immediate: true },
)

// The self-service trigger mutates the CURRENT user's status on the
// backend, computing the actual transition itself (no client-sent target
// status, see useBookings.ts's changeBookingStatus() docstring) -- a full
// list refresh afterward mirrors Legacy's own Inertia GET-visit to this
// same page, which reloads every card's `user_booking` in one go.
async function handleChangeStatus(performanceId: number): Promise<void> {
  const confirmed = await confirmAction()
  if (!confirmed) return

  try {
    await changeBookingStatus(performanceId)
    performances.value = await listForMonth(year.value, month.value)
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
      <div v-else class="text-center">Für diesen Monat sind keine Aufführungen geplant.</div>
    </div>
  </div>
</template>
