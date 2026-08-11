<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSupport } from '@/composables/useSupport'
import { useBookings, type PerformanceShortBase } from '@/composables/useBookings'
import { confirmAction, showToast } from '@/services/notifications'
import PerformanceCard from '@/components/performances/PerformanceCard.vue'

// 1:1 Legacy's Content/Common/Selfadmin/Support/RequestsAndBookings.vue --
// `booking-trigger` + `show-menu` (Legacy: with-menu), no `with-status`
// prop (doesn't exist on our PerformanceCard -- the badge already shows
// itself whenever `user_booking` is present, see PerformanceCard.vue).
const { getMyRequestsAndBookings } = useSupport()
const { changeBookingStatus } = useBookings()

const performances = ref<PerformanceShortBase[]>([])

async function load(): Promise<void> {
  performances.value = await getMyRequestsAndBookings()
}

onMounted(load)

// Mirrors PerformanceCalendarView.vue's handler: server computes the actual
// transition itself, a full reload afterward mirrors Legacy's own
// Inertia GET-revisit.
async function handleChangeStatus(performanceId: number): Promise<void> {
  const confirmed = await confirmAction()
  if (!confirmed) return

  try {
    await changeBookingStatus(performanceId)
    await load()
  } catch {
    showToast('Ein unerwarteter Fehler ist aufgetreten.', true)
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Meine Anfragen und Buchungen</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-md-8">
      <div v-if="performances.length">
        <PerformanceCard
          v-for="performance in performances"
          :key="performance.id"
          :performance="{ ...performance, ordinariumwork_demanding: false }"
          show-menu
          booking-trigger
          @change-status="handleChangeStatus(performance.id)"
        />
      </div>
      <div v-else class="text-center">Derzeit liegen keine Anfragen oder Buchungen vor.</div>
    </div>
  </div>
</template>
