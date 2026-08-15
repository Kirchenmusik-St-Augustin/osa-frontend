<script setup lang="ts">
import { ref, watch } from 'vue'
import draggable from 'vuedraggable'
import type { CastMember, NotBookedEntry } from '@/composables/useBookings'

// 1:1 port of Legacy's SingleCastListComponent.vue -- the currently cast
// candidates for ONE position, with Auf/Ab reordering (Promote/Demote),
// now ALSO reorderable by drag (user request, phone-first: keep ↑↓ as a
// keyboard/accessibility fallback, add press-and-hold drag on top -- no
// Legacy equivalent, so no pixel-parity constraint applies to this
// interaction). Purely client-side array manipulation: unlike
// Coreelement's move (one API call per click), the whole cast+not_booked
// payload is only sent once, on CastView's "speichern" (see
// project_osa_migration_plan memory, Schritt 6 plan B.2/B.3). `not_booked`
// itself is performance-wide, not per-position data (see
// app.schemas.booking.CastFormData) -- but Legacy still renders the same
// list redundantly under EVERY position's own box (verified live against
// osa.dev.schimpl.cc/content/music/performances/{id}/cast), not once at
// the bottom of the page, so that's what this component does too.
const props = defineProps<{
  cast: CastMember[]
  required: number
  notBooked: NotBookedEntry[]
}>()

const emit = defineEmits<{
  'cast-changed': [cast: CastMember[]]
  'remove-not-booked': [id: number]
}>()

// SortableJS long-press tuning for touch: `delay` is how long a touch must
// hold before a drag starts (kept out of scroll's way); `delayOnTouchOnly`
// keeps mouse/desktop instant; `touchStartThreshold` is the jitter
// tolerance during that hold -- a real finger moving further than this
// before the delay elapses cancels the pending drag in favour of a normal
// scroll (this IS the "don't conflict with scrolling" mechanism).
const TOUCH_DRAG_DELAY_MS = 200
const TOUCH_DRAG_JITTER_PX = 5

// vuedraggable needs a real bindable array; `props.cast` is read-only.
// Mirrors DateTimePicker.vue's localDate/model pattern.
const localCast = ref<CastMember[]>([...props.cast])

// Resync downward only when content actually differs (JSON.stringify is
// the established equality idiom for these plain id/name/fee arrays in
// this exact component family -- see CastItem.vue's castChanged,
// CastView.vue's setForm). A reorder we just emitted round-trips back down
// as the same array via CastItem -> CastView -> props.cast; an
// unconditional resync would clobber localCast mid-gesture with an
// identical-content copy right as SortableJS is animating. "add-to"/
// "auf derz. Werte zurücksetzen" replace the array with different content
// and must still resync -- this single guard covers both.
watch(
  () => props.cast,
  (next) => {
    if (JSON.stringify(next) !== JSON.stringify(localCast.value)) {
      localCast.value = [...next]
    }
  },
)

// The one thing a real drag gesture produces: a full reordered array from
// vuedraggable's update:modelValue. Kept as its own named function (not
// inlined into a v-model watcher) so it's directly testable by emitting
// update:model-value on the mocked <draggable> stub, without simulating
// an actual pointer/touch gesture (impractical in jsdom).
function handleReorder(next: CastMember[]): void {
  localCast.value = next
  emit('cast-changed', next)
}

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
    <draggable
      class="d-flex flex-column gap-1"
      :model-value="localCast"
      item-key="id"
      handle=".drag-handle"
      :delay="TOUCH_DRAG_DELAY_MS"
      :delay-on-touch-only="true"
      :touch-start-threshold="TOUCH_DRAG_JITTER_PX"
      :animation="150"
      ghost-class="cast-drag-ghost"
      chosen-class="cast-drag-chosen"
      @update:model-value="handleReorder"
    >
      <template #item="{ element, index }">
        <div class="bg-body rounded px-2 py-1 shadow-sm">
          <small :class="index < required ? ['text-success', 'fw-bold'] : ['text-info']">
            <span class="me-2">
              <i
                class="fas fa-grip-vertical drag-handle c-grab p-1 me-2"
                title="ziehen zum Sortieren (am Handy: kurz gedrückt halten)"
              ></i>
              <i class="fas fa-times c-pointer" title="entfernen" @click="remove(element.id)"></i>

              <i
                v-if="index < cast.length - 1"
                class="fas fa-arrow-down mx-1 c-pointer"
                @click="move(index, 'down')"
              ></i>
              <i v-else class="fas fa-arrow-down mx-1" style="color: #ccc"></i>

              <i v-if="index > 0" class="fas fa-arrow-up c-pointer" @click="move(index, 'up')"></i>
              <i v-else class="fas fa-arrow-up" style="color: #ccc"></i>
            </span>
            <span>{{ element.name }} ({{ element.fee }})</span>
          </small>
        </div>
      </template>
    </draggable>
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
