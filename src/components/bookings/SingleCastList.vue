<script setup lang="ts">
import type { CastMember, NotBookedEntry } from '@/composables/useBookings'

// 1:1 port of Legacy's SingleCastListComponent.vue -- the currently cast
// candidates for ONE position, with Auf/Ab reordering (Promote/Demote).
// Purely client-side array manipulation: unlike Coreelement's move (one API
// call per click), the whole cast+not_booked payload is only sent once, on
// CastView's "speichern" (see project_osa_migration_plan memory, Schritt 6
// plan B.2/B.3). `not_booked` itself is performance-wide, not per-position
// data (see app.schemas.booking.CastFormData) -- but Legacy still renders
// the same list redundantly under EVERY position's own box (verified live
// against osa.dev.schimpl.cc/content/music/performances/{id}/cast), not
// once at the bottom of the page, so that's what this component does too.
const props = defineProps<{
  cast: CastMember[]
  required: number
  notBooked: NotBookedEntry[]
}>()

const emit = defineEmits<{
  'cast-changed': [cast: CastMember[]]
  'remove-not-booked': [id: number]
}>()

function removeNotBooked(id: number): void {
  emit('remove-not-booked', id)
}

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
    <div v-for="(item, index) in cast" :key="item.id">
      <small :class="index < required ? ['text-success', 'fw-bold'] : ['text-info']">
        <span class="me-2">
          <i class="fas fa-times c-pointer" title="entfernen" @click="remove(item.id)"></i>

          <i
            v-if="index < cast.length - 1"
            class="fas fa-arrow-down mx-1 c-pointer"
            @click="move(index, 'down')"
          ></i>
          <i v-else class="fas fa-arrow-down mx-1" style="color: #ccc"></i>

          <i v-if="index > 0" class="fas fa-arrow-up c-pointer" @click="move(index, 'up')"></i>
          <i v-else class="fas fa-arrow-up" style="color: #ccc"></i>
        </span>
        <span>{{ item.name }} ({{ item.fee }})</span>
      </small>
    </div>
    <div v-if="notBooked.length" class="mt-2">
      <small class="text-danger fw-bold">nicht gebucht:</small>
      <div v-for="item in notBooked" :key="`notBooked_${item.id}`">
        <small class="text-danger">
          <span class="me-2">
            <i
              class="fas fa-times c-pointer"
              title="entfernen"
              @click="removeNotBooked(item.id)"
            ></i>
          </span>
          <span>{{ item.name }}</span>
        </small>
      </div>
    </div>
  </div>
</template>
