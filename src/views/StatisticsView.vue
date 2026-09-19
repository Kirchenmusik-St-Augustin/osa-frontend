<script setup lang="ts">
// Statistics badges -- no count-up animation (no dependency for a purely
// cosmetic effect). Every badge is thousands-grouped with a literal comma
// via a one-line formatter ("1,274", not German "1.274" -- deliberately
// not locale-aware).
import { onMounted, ref } from 'vue'
import { useStatistics, type Statistics } from '@/composables/useStatistics'
import EmailThresholdWarning from '@/components/common/EmailThresholdWarning.vue'

const { get } = useStatistics()

const stats = ref<Statistics | null>(null)

function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}

onMounted(async () => {
  stats.value = await get()
})
</script>

<template>
  <h2 class="h2 text-center mb-4">Statistiken</h2>

  <div v-if="stats" class="row justify-content-center mt-4">
    <div class="col-md-7">
      <div class="list-group mb-4">
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span>Benutzer</span>
          <div class="h3">
            <span class="badge bg-primary rounded-pill">{{ formatCount(stats.users) }}</span>
          </div>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span>Aufführungen</span>
          <div class="h3">
            <span class="badge bg-primary rounded-pill">{{ formatCount(stats.performances) }}</span>
          </div>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span>Ordinarium-Kompositionen</span>
          <div class="h3">
            <span class="badge bg-primary rounded-pill">{{
              formatCount(stats.ordinariumworks)
            }}</span>
          </div>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span>Proprium-Kompositionen</span>
          <div class="h3">
            <span class="badge bg-primary rounded-pill">{{
              formatCount(stats.propriumworks)
            }}</span>
          </div>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span>Partituren im Archiv</span>
          <div class="h3">
            <span class="badge bg-primary rounded-pill">{{ formatCount(stats.scores) }}</span>
          </div>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span>
            <span>E-Mail-Output der vergangenen {{ stats.email.period_days }} Tage</span>
            <small class="text-black-50 ms-2">(max. {{ stats.email.threshold }})</small>
          </span>
          <div class="h3">
            <span class="badge bg-primary rounded-pill">{{ formatCount(stats.email.sent) }}</span>
          </div>
        </div>
      </div>

      <EmailThresholdWarning variant="card" />
    </div>
  </div>
</template>
