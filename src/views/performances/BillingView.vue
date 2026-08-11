<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PerformanceCard from '@/components/performances/PerformanceCard.vue'
import { useBookings, type PerformanceBilling } from '@/composables/useBookings'
import { parseWallClock } from '@/services/dateFormat'

// Port of Legacy's Billing.vue -- no past-lock (see
// booking_service.get_billing's docstring), printable via window.print().
const props = defineProps<{ id: string }>()
const { getBilling } = useBookings()

const performance = ref<PerformanceBilling | null>(null)

onMounted(async () => {
  performance.value = await getBilling(Number(props.id))
})

// Legacy's "zurück" goes to the calendar month of the performance's own
// schedule (PerformanceController::billing() links to
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

const TYPE_LABELS = {
  instruments: 'Instrumente',
  voices: 'Stimmen',
  choirjobs: 'Choraufgaben',
} as const

const BILLING_TYPES = ['instruments', 'voices', 'choirjobs'] as const

// orgfee has no "voices" -- only instruments/choirjobs get an Einteilungstarif line.
const ORGFEE_TYPES = ['instruments', 'choirjobs'] as const

function printWindow(): void {
  window.print()
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Abrechnung</h2>

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

      <div class="text-center my-4 d-print-none">
        <RouterLink class="btn btn-primary mx-2" :to="backTarget"> zurück </RouterLink>
        <button type="button" class="btn btn-primary mx-2" @click="printWindow">drucken</button>
      </div>

      <div v-for="type in BILLING_TYPES" :key="type" class="mx-auto py-2">
        <div class="h4 text-center">{{ TYPE_LABELS[type] }}</div>
        <div v-for="item in performance.billing[type].items" :key="item.id" class="mb-3">
          <div class="h5">{{ item.name }}</div>
          <div
            v-for="(position, index) in item.positions"
            :key="index"
            class="d-flex justify-content-between border-bottom"
          >
            <span :class="position.id === null ? 'text-black-50' : 'fw-semibold'">{{
              position.name
            }}</span>
            <span>{{ position.fee }}</span>
          </div>
        </div>
      </div>

      <div class="mx-auto pt-3">
        <div class="h4 text-center">Zusammenfassung</div>
        <template v-for="type in BILLING_TYPES" :key="`summary-${type}`">
          <div
            v-if="performance.billing[type].sum > 0"
            class="d-flex justify-content-between border-bottom border-light"
          >
            <span>{{ TYPE_LABELS[type] }} ({{ performance.billing[type].count }})</span>
            <span>{{ performance.billing[type].sum }}</span>
          </div>
        </template>
        <template v-for="type in ORGFEE_TYPES" :key="`orgfee-${type}`">
          <div
            v-if="performance.billing.orgfee[type] > 0"
            class="d-flex justify-content-between border-bottom border-light"
          >
            <span>Einteilungstarif ({{ TYPE_LABELS[type] }})</span>
            <span>{{ performance.billing.orgfee[type] }}</span>
          </div>
        </template>
        <div
          v-if="performance.billing.extracost.amount > 0"
          class="d-flex justify-content-between border-bottom border-light"
        >
          <span>Extrakosten ({{ performance.billing.extracost.description }})</span>
          <span>{{ performance.billing.extracost.amount }}</span>
        </div>
        <div class="d-flex justify-content-between border-bottom border-dark">
          <strong class="text-danger">Summe</strong>
          <strong class="text-danger">{{ performance.billing.sum }}</strong>
        </div>
      </div>

      <div class="text-center my-5 d-print-none">
        <RouterLink class="btn btn-primary mx-2" :to="backTarget"> zurück </RouterLink>
        <button type="button" class="btn btn-primary mx-2" @click="printWindow">drucken</button>
      </div>
    </div>
  </div>
</template>
