<script setup lang="ts">
import { computed } from 'vue'
import { formatMonthYear } from '@/services/dateFormat'

// Prev/Home/Next month navigator shared by the calendar and the month-based
// admin lists (SentEmailIndexView/RequestLogIndexView). `routeName` is the
// ONLY route these arrows navigate to (each caller owns its own
// year/month-driven data reload via a `watch()` on its own
// `useMonthQuery()` result).
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
      <RouterLink
        :to="{ name: routeName, query: previousTarget }"
        title="Vormonat"
        aria-label="Vormonat"
        ><i class="fas fa-arrow-left" aria-hidden="true"></i
      ></RouterLink>
      <RouterLink
        :to="{ name: routeName, query: currentTarget }"
        class="px-4"
        title="Aktueller Monat"
        aria-label="Aktueller Monat"
        ><i class="fas fa-home" aria-hidden="true"></i
      ></RouterLink>
      <RouterLink
        :to="{ name: routeName, query: nextTarget }"
        title="Folgemonat"
        aria-label="Folgemonat"
        ><i class="fas fa-arrow-right" aria-hidden="true"></i
      ></RouterLink>
    </div>
  </div>
</template>
