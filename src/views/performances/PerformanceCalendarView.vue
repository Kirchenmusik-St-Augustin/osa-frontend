<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePerformances, type PerformanceCalendarItem } from '@/composables/usePerformances'
import { formatMonthYear } from '@/services/dateFormat'
import PerformanceCard from '@/components/performances/PerformanceCard.vue'

// The de-facto app home (Legacy redirects '/' to the performances calendar,
// see routes/web.php `Route::redirect('/', 'content/music/performances')`)
// -- there is no separate "Kalender" nav entry anywhere in Legacy either.
const route = useRoute()
const authStore = useAuthStore()
const { listForMonth } = usePerformances()

const now = new Date()

function toMonthPart(value: unknown, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  return Number.isInteger(parsed) ? parsed : fallback
}

const year = computed(() => toMonthPart(route.query['year'], now.getFullYear()))
const month = computed(() => toMonthPart(route.query['month'], now.getMonth() + 1))

function shiftMonth(y: number, m: number, delta: number): { year: number; month: number } {
  const shifted = new Date(y, m - 1 + delta, 1)
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 }
}

const previousTarget = computed(() => shiftMonth(year.value, month.value, -1))
const nextTarget = computed(() => shiftMonth(year.value, month.value, 1))
const currentTarget = { year: now.getFullYear(), month: now.getMonth() + 1 }

const performances = ref<PerformanceCalendarItem[]>([])

watch(
  [year, month],
  async ([currentYear, currentMonth]) => {
    performances.value = await listForMonth(currentYear, currentMonth)
  },
  { immediate: true },
)
</script>

<template>
  <h2 class="h2 text-center mb-4">Kalender</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-md-8 justify-content-center">
      <div class="text-center mb-4">
        <div class="h4 mb-4">{{ formatMonthYear(year, month) }}</div>
        <div class="mb-3">
          <RouterLink :to="{ name: 'home', query: previousTarget }"
            ><i class="fas fa-arrow-left"></i
          ></RouterLink>
          <RouterLink :to="{ name: 'home', query: currentTarget }" class="px-4"
            ><i class="fas fa-home"></i
          ></RouterLink>
          <RouterLink :to="{ name: 'home', query: nextTarget }"
            ><i class="fas fa-arrow-right"></i
          ></RouterLink>
        </div>
      </div>

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
          init-show-rehearsals
        />
      </div>
      <div v-else class="text-center">Für diesen Monat sind keine Aufführungen geplant.</div>
    </div>
  </div>
</template>
