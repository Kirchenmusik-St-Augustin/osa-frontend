<script setup lang="ts">
import { computed } from 'vue'
import type { BookingStatus } from '@/composables/useBookings'
import { nextActionFor } from '@/composables/useBookings'
import { formatDateTime } from '@/services/dateFormat'

// Combines Legacy's two always-paired components (BookingStatusComponent's
// badge + BookingTriggerComponent's self-service icon) into one -- both are
// driven by the exact same `status` prop and never appear independently in
// any Legacy template (PerformanceCardComponent.vue always renders them
// side by side), so splitting them would be a Hasty Abstraction, not less
// coupling (CLAUDE.md AHA-Prinzip).
const props = withDefaults(
  defineProps<{ status: BookingStatus; explainUnbookable?: boolean; interactive?: boolean }>(),
  { explainUnbookable: false, interactive: false },
)

const emit = defineEmits<{ trigger: [] }>()

// Keyed lookups instead of switch statements -- keeps each computed a
// single expression (a `switch` with 5+ branches here trips the linter's
// cyclomatic-complexity ceiling for no real readability gain).
const BADGE_BY_STATUS: Record<number, { text: (position: string) => string; badgeClass: string }> =
  {
    2: { text: () => 'angefragt', badgeClass: 'text-bg-warning' },
    3: { text: (position) => `Standby für ${position}`, badgeClass: 'text-bg-info' },
    4: { text: (position) => `Gebucht für ${position}`, badgeClass: 'text-bg-success' },
    5: { text: () => 'nicht gebucht', badgeClass: 'text-bg-danger' },
  }

const TRIGGER_TITLE_BY_STATUS: Record<number, string> = {
  1: 'Buchung anfragen',
  2: 'Anfrage stornieren',
  3: 'Standby stornieren',
  4: 'Buchung stornieren',
  5: 'Anfrage stornieren',
}

const badge = computed((): { text: string; badgeClass: string } | null => {
  if (props.status.status === 0) {
    return props.explainUnbookable
      ? { text: '(hat angefragt, aber ist nicht buchbar)', badgeClass: 'text-bg-light' }
      : null
  }
  const entry = BADGE_BY_STATUS[props.status.status]
  if (!entry) return null
  return { text: entry.text(props.status.position?.name ?? ''), badgeClass: entry.badgeClass }
})

const tooltip = computed(() =>
  props.status.at ? `status changed at: ${formatDateTime(props.status.at)}` : undefined,
)

const action = computed(() => nextActionFor(props.status.status))

const triggerIcon = computed(() =>
  action.value === 'request' ? 'fa-hand-point-up' : 'fa-times-circle',
)
const triggerColor = computed(() => (action.value === 'request' ? 'text-danger' : 'text-secondary'))
const triggerTitle = computed(() => TRIGGER_TITLE_BY_STATUS[props.status.status] ?? '')
</script>

<template>
  <span v-if="badge" class="badge" :class="badge.badgeClass" :title="tooltip">{{
    badge.text
  }}</span>
  <i
    v-if="interactive && action"
    class="fas c-pointer ms-2"
    :class="[triggerIcon, triggerColor]"
    :title="triggerTitle"
    @click="emit('trigger')"
  ></i>
</template>
