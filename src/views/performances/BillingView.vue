<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PerformanceCard from '@/components/performances/PerformanceCard.vue'
import { useBookings, type PerformanceBilling } from '@/composables/useBookings'

// Port of Legacy's Billing.vue -- no past-lock (see
// booking_service.get_billing's docstring), printable via window.print().
const props = defineProps<{ id: string }>()
const { getBilling } = useBookings()

const performance = ref<PerformanceBilling | null>(null)

onMounted(async () => {
  performance.value = await getBilling(Number(props.id))
})

const TYPE_LABELS = {
  instruments: 'Instrumente',
  voices: 'Stimmen',
  choirjobs: 'Choraufgaben',
} as const

function printWindow(): void {
  window.print()
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Abrechnung</h2>

  <div v-if="performance" class="row justify-content-center mt-4">
    <div class="col-md-8 justify-content-center">
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

      <div class="text-center my-3 d-print-none">
        <RouterLink
          class="btn btn-primary mx-2"
          :to="{ name: 'performances-show', params: { id: performance.id } }"
        >
          zurück
        </RouterLink>
        <button type="button" class="btn btn-secondary mx-2" @click="printWindow">drucken</button>
      </div>

      <div v-for="type in ['instruments', 'voices', 'choirjobs'] as const" :key="type" class="mb-4">
        <div class="h4">{{ TYPE_LABELS[type] }}</div>
        <div v-for="item in performance.billing[type].items" :key="item.id" class="mb-2">
          <div class="h5">{{ item.name }}</div>
          <div
            v-for="(position, index) in item.positions"
            :key="index"
            class="d-flex justify-content-between"
          >
            <span :class="position.id === null ? 'text-black-50' : 'fw-semibold'">{{
              position.name
            }}</span>
            <span>{{ position.fee }}</span>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <div class="h4">Zusammenfassung</div>
        <div class="d-flex justify-content-between">
          <span>Instrumente</span><span>{{ performance.billing.instruments.sum }}</span>
        </div>
        <div class="d-flex justify-content-between">
          <span>Stimmen</span><span>{{ performance.billing.voices.sum }}</span>
        </div>
        <div class="d-flex justify-content-between">
          <span>Choraufgaben</span><span>{{ performance.billing.choirjobs.sum }}</span>
        </div>
        <div class="d-flex justify-content-between">
          <span>Einteilungstarif Instrumente</span
          ><span>{{ performance.billing.orgfee.instruments }}</span>
        </div>
        <div class="d-flex justify-content-between">
          <span>Einteilungstarif Choraufgaben</span
          ><span>{{ performance.billing.orgfee.choirjobs }}</span>
        </div>
        <div v-if="performance.billing.extracost.amount > 0" class="d-flex justify-content-between">
          <span>{{ performance.billing.extracost.description }}</span>
          <span>{{ performance.billing.extracost.amount }}</span>
        </div>
        <div class="d-flex justify-content-between text-danger fw-bold mt-2">
          <span>Gesamt</span><span>{{ performance.billing.sum }}</span>
        </div>
      </div>

      <div class="text-center my-3 d-print-none">
        <RouterLink
          class="btn btn-primary mx-2"
          :to="{ name: 'performances-show', params: { id: performance.id } }"
        >
          zurück
        </RouterLink>
        <button type="button" class="btn btn-secondary mx-2" @click="printWindow">drucken</button>
      </div>
    </div>
  </div>
</template>
