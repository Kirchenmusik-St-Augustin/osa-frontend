<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PerformanceCard from '@/components/performances/PerformanceCard.vue'
import BookingStatusBadge from '@/components/bookings/BookingStatusBadge.vue'
import { useBookings, type PerformanceRequestsAndBookings } from '@/composables/useBookings'
import { parseWallClock } from '@/services/dateFormat'

// Port of Legacy's RequestsAndBookings.vue -- available to planner AND
// disponent (gated on performanceMaintain, not performanceCast), unlike the
// actual Cast page.
const props = defineProps<{ id: string }>()
const { getRequestsAndBookings } = useBookings()

const performance = ref<PerformanceRequestsAndBookings | null>(null)

onMounted(async () => {
  performance.value = await getRequestsAndBookings(Number(props.id))
})

// Legacy's "zurück" goes to the calendar month of the performance's own
// schedule (PerformanceController::requestsAndBookings() links to
// `route('...performances.index', { year, month })`), never to the
// performance's own show/detail page.
const backTarget = computed(() => {
  if (!performance.value) return { name: 'home' as const }
  const scheduleDate = parseWallClock(performance.value.schedule)
  return {
    name: 'home' as const,
    query: { year: scheduleDate.getFullYear(), month: scheduleDate.getMonth() + 1 },
  }
})
</script>

<template>
  <h2 class="h2 text-center mb-4">Anfragen und Buchungen</h2>

  <div v-if="performance" class="row justify-content-center mt-4">
    <div class="col-md-7 justify-content-center">
      <PerformanceCard
        :performance="{
          id: performance.id,
          schedule: performance.schedule,
          location: performance.location,
          ordinariumwork_name: performance.ordinariumwork_name,
          ordinariumwork_artist_name: performance.ordinariumwork_artist_name,
          ordinariumwork_demanding: false,
          artist_name: performance.artist_name,
          proprium: performance.proprium,
          demanding_proprium: performance.demanding_proprium,
          rehearsals: performance.rehearsals,
        }"
      />

      <div class="text-center my-4">
        <RouterLink class="btn btn-primary mx-2" :to="backTarget"> zurück </RouterLink>
      </div>

      <table v-if="performance.entries.length" class="table mt-3">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in performance.entries" :key="entry.id">
            <td>{{ entry.name }}</td>
            <td><BookingStatusBadge :status="entry.status" explain-unbookable /></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-center mt-3">Derzeit liegen keine Buchungen oder Anfragen vor.</p>

      <div class="text-center my-4">
        <RouterLink class="btn btn-primary mx-2" :to="backTarget"> zurück </RouterLink>
      </div>
    </div>
  </div>
</template>
