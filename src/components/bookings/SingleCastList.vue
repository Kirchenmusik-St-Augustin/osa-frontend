<script setup lang="ts">
import type { CastMember } from '@/composables/useBookings'

// 1:1 port of Legacy's SingleCastListComponent.vue -- the currently cast
// candidates for ONE position, with Auf/Ab reordering (Promote/Demote).
// Purely client-side array manipulation: unlike Coreelement's move (one API
// call per click), the whole cast+not_booked payload is only sent once, on
// CastView's "speichern" (see project_osa_migration_plan memory, Schritt 6
// plan B.2/B.3). `not_booked` itself is performance-wide, not per-position
// (see app.schemas.booking.CastFormData) -- rendered once at CastView
// level, not duplicated under every position here.
const props = defineProps<{
  cast: CastMember[]
  required: number
}>()

const emit = defineEmits<{ 'cast-changed': [cast: CastMember[]] }>()

function move(index: number, direction: 'up' | 'down'): void {
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= props.cast.length) return
  const next = [...props.cast]
  ;[next[index], next[target]] = [next[target] as CastMember, next[index] as CastMember]
  emit('cast-changed', next)
}

function remove(id: number): void {
  emit(
    'cast-changed',
    props.cast.filter((item) => item.id !== id),
  )
}
</script>

<template>
  <div>
    <div
      v-for="(item, index) in cast"
      :key="item.id"
      class="d-flex align-items-center justify-content-between"
    >
      <div>
        <i
          class="fas fa-times c-pointer text-danger me-2"
          title="entfernen"
          @click="remove(item.id)"
        ></i>
        <i
          class="fas fa-arrow-up c-pointer me-1"
          :class="index === 0 ? 'text-black-50' : ''"
          title="nach oben"
          @click="move(index, 'up')"
        ></i>
        <i
          class="fas fa-arrow-down c-pointer me-2"
          :class="index >= cast.length - 1 ? 'text-black-50' : ''"
          title="nach unten"
          @click="move(index, 'down')"
        ></i>
        <span :class="index < required ? 'text-success fw-bold' : 'text-info'">
          {{ item.name }} ({{ item.fee }})
        </span>
      </div>
    </div>
  </div>
</template>
