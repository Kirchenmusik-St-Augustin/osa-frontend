<script setup lang="ts">
import { computed } from 'vue'
import { formatMonthYear } from '@/services/dateFormat'

// Extracted (Schritt 9) from PerformanceCalendarView.vue's inline
// Prev/Home/Next month navigator -- 2nd real use reached with
// SentEmailIndexView/RequestLogIndexView (AHA principle, same bar as
// UserDataCard.vue before it). `routeName` is the ONLY route these arrows
// navigate to (each caller owns its own year/month-driven data reload via
// a `watch()` on its own `useMonthQuery()` result).
const props = defineProps<{ year: number; month: number; routeName: string }>()

const now = new Date()

function shiftMonth(y: number, m: number, delta: number): { year: number; month: number } {
  const shifted = new Date(y, m - 1 + delta, 1)
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 }
}

const previousTarget = computed(() => shiftMonth(props.year, props.month, -1))
const nextTarget = computed(() => shiftMonth(props.year, props.month, 1))
const currentTarget = { year: now.getFullYear(), month: now.getMonth() + 1 }
</script>

<template>
  <div class="text-center mb-4">
    <div class="h4 mb-4">{{ formatMonthYear(year, month) }}</div>
    <div class="mb-3">
      <RouterLink :to="{ name: routeName, query: previousTarget }"
        ><i class="fas fa-arrow-left"></i
      ></RouterLink>
      <RouterLink :to="{ name: routeName, query: currentTarget }" class="px-4"
        ><i class="fas fa-home"></i
      ></RouterLink>
      <RouterLink :to="{ name: routeName, query: nextTarget }"
        ><i class="fas fa-arrow-right"></i
      ></RouterLink>
    </div>
  </div>
</template>
