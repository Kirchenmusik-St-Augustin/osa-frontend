<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import PerformanceCard from '@/components/performances/PerformanceCard.vue'
import { usePerformances, type PerformanceShow } from '@/composables/usePerformances'
import { parseWallClock } from '@/services/dateFormat'

// Casting is deliberately not shown here -- Legacy's own Show.php/Show.vue
// disable it ("showing casts is disabled as requested by Peter
// Tiefengraber"), and the Booking domain doesn't exist in this backend yet
// anyway (Schritt 6).
const props = defineProps<{ id: string }>()
const { getDetail } = usePerformances()

const performance = ref<PerformanceShow | null>(null)

const backQuery = computed(() => {
  if (!performance.value) return { year: undefined, month: undefined }
  const date = parseWallClock(performance.value.schedule)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
})

onMounted(async () => {
  performance.value = await getDetail(Number(props.id))
})
</script>

<template>
  <h2 class="h2 text-center mb-4">Aufführung - Details</h2>

  <div v-if="performance" class="row justify-content-center mt-4">
    <div class="col-md-7 justify-content-center">
      <PerformanceCard :performance="performance" init-show-proprium init-show-rehearsals />

      <CollapsibleSection v-if="performance.description" title="Details" init-show>
        {{ performance.description }}
      </CollapsibleSection>
      <CollapsibleSection v-if="performance.location.address" title="Adresse">
        {{ performance.location.address }}
      </CollapsibleSection>
      <CollapsibleSection
        v-if="performance.ordinariumwork_description"
        title="Details zum Ordinarium"
      >
        {{ performance.ordinariumwork_description }}
      </CollapsibleSection>
      <CollapsibleSection
        v-if="performance.ordinariumwork_artist_description"
        title="Details zum Komponisten"
      >
        {{ performance.ordinariumwork_artist_description }}
      </CollapsibleSection>

      <div class="text-center my-5">
        <RouterLink class="btn btn-primary mx-2" :to="{ name: 'home', query: backQuery }">
          zurück
        </RouterLink>
      </div>
    </div>
  </div>
</template>
