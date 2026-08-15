<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import draggable from 'vuedraggable'
import type { CastMember, NotBookedEntry } from '@/composables/useBookings'
import FormCheckbox from '@/components/common/FormCheckbox.vue'

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
//
// Choirjobs-only "autom. Sortierung" (no Legacy equivalent, real-user
// request): when active, the cast list is grouped/sorted by each member's
// assigned singing Voice ("Stimme", not the sibling "Stimmen" position
// type) instead of being manually reorderable. Backend resolves each
// user's lowest-`Voice.order` assignment server-side
// (booking_service._primary_voice_by_user) -- this component only ever
// sorts/groups by the already-resolved voice_name/voice_order fields.
const props = defineProps<{
  cast: CastMember[]
  required: number
  notBooked: NotBookedEntry[]
  allowAutoSort: boolean
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

// Reordering a single person is meaningless -- hide the grip handle and
// both arrows entirely once there's nobody to reorder against (✕ stays,
// removing is still meaningful with just one person).
const canReorder = computed(() => props.cast.length > 1)

const UNKNOWN_VOICE_LABEL = 'Stimmlage unbekannt'
const autoSort = ref(false)
const autoSortId = useId()

// Type guard (not a loose != null check -- this project's eqeqeq rule
// forbids that) so the sort comparator below never needs ??-fallbacks:
// TS narrows voice_name/voice_order to non-nullable for anything that
// passes this check.
function hasVoice(
  member: CastMember,
): member is CastMember & { voice_name: string; voice_order: number } {
  return typeof member.voice_name === 'string' && typeof member.voice_order === 'number'
}

// Pure, always-current derivation of props.cast -- Voice.order ascending,
// alphabetical within a Voice, "Stimmlage unbekannt" (no assigned Voice)
// last, alphabetical there too. Cheap to always compute; only CONSULTED
// (rendered/emitted) when autoSort is true.
const groupedCast = computed<CastMember[]>(() => {
  const withVoice = props.cast.filter(hasVoice)
  const withoutVoice = props.cast.filter((m) => !hasVoice(m))
  const sortedWithVoice = [...withVoice].sort((a, b) => {
    if (a.voice_order !== b.voice_order) return a.voice_order - b.voice_order
    if (a.voice_name !== b.voice_name) return a.voice_name.localeCompare(b.voice_name)
    return a.name.localeCompare(b.name)
  })
  const sortedWithoutVoice = [...withoutVoice].sort((a, b) => a.name.localeCompare(b.name))
  return [...sortedWithVoice, ...sortedWithoutVoice]
})

interface VoiceGroup {
  key: string
  label: string
  rows: { member: CastMember; index: number }[]
}

// groupedCast is already fully sorted (same Voice => adjacent, since
// voice_order/voice_name are identical for every member sharing a Voice),
// so a single pass over consecutive runs is enough to build display groups
// -- no risk of a Voice's members being split across two groups.
const voiceGroups = computed<VoiceGroup[]>(() => {
  const groups: VoiceGroup[] = []
  groupedCast.value.forEach((member, index) => {
    const key = member.voice_name ?? UNKNOWN_VOICE_LABEL
    const last = groups.at(-1)
    if (last?.key === key) {
      last.rows.push({ member, index })
    } else {
      groups.push({ key, label: member.voice_name ?? UNKNOWN_VOICE_LABEL, rows: [{ member, index }] })
    }
  })
  return groups
})

// Reactive, guarded re-emit: whenever autoSort is on AND the sorted order
// differs from what the parent currently holds, push it up -- this is what
// makes a newly-added candidate (SingleCastSelector "hinzufügen") land in
// its correct group immediately instead of being appended at the end. The
// guard (id-list comparison) is what prevents an infinite loop -- once the
// parent's `cast` prop reflects the just-emitted order, groupedCast()
// recomputed over that already-sorted input produces the SAME order, the
// ids match, and the watcher is a no-op on the next tick. Also means
// merely flipping the switch on an already-sorted list doesn't spuriously
// mark the form dirty.
watch([autoSort, groupedCast], () => {
  if (!autoSort.value) return
  const next = groupedCast.value
  const nextIds = next.map((m) => m.id)
  const currentIds = props.cast.map((m) => m.id)
  if (JSON.stringify(nextIds) !== JSON.stringify(currentIds)) {
    emit('cast-changed', next)
  }
})

// Members present in BOTH `previous` and `current`, in `previous`'s
// relative order; anything only in `current` (added while auto-sort was
// on) is appended afterward, in its current relative order. Anything only
// in `previous` (removed while auto-sort was on) is dropped.
function restoreManualOrder(previous: CastMember[], current: CastMember[]): CastMember[] {
  const remainingIds = new Set(current.map((m) => m.id))
  const currentById = new Map(current.map((m) => [m.id, m]))
  const restored: CastMember[] = []
  for (const member of previous) {
    const stillCurrent = remainingIds.has(member.id) ? currentById.get(member.id) : undefined
    if (stillCurrent) {
      restored.push(stillCurrent)
      remainingIds.delete(member.id)
    }
  }
  for (const member of current) {
    if (remainingIds.has(member.id)) restored.push(member)
  }
  return restored
}

// Turning auto-sort back OFF must restore the manual order it had right
// before auto-sort was switched ON -- not just leave the list in whatever
// auto-sorted order it last had (that was the original, wrong behavior:
// confirmed live that toggling on/off a list with no assigned voices left
// it fully alphabetized instead of reverting).
//
// This capture/restore deliberately does NOT live in a separate
// watch(autoSort, ...) callback. Vue's watcher-flush ordering is an
// implementation detail, not a stable contract -- live testing showed the
// groupedCast-sync watcher above (which reactively emits the sorted array
// and round-trips it back down as a new `cast` prop) can run and settle
// BEFORE a sibling watcher on the same `autoSort` ref gets its turn,
// which silently captured the ALREADY-sorted array as the "pre-sort"
// snapshot instead of the true original. Driving this directly off the
// checkbox's own update:model-value event sidesteps the scheduler
// entirely: this handler runs synchronously, and Vue's watchers (`pre`
// flush, microtask-scheduled) never run mid-way through a single
// synchronous function call, so `props.cast` is guaranteed to still be
// whatever it was the instant BEFORE this toggle at every point below.
let preAutoSortOrder: CastMember[] | null = null

function handleAutoSortToggle(value: boolean): void {
  if (value) {
    preAutoSortOrder = [...props.cast]
    autoSort.value = value
    return
  }
  autoSort.value = value
  if (preAutoSortOrder === null) return
  const restored = restoreManualOrder(preAutoSortOrder, props.cast)
  preAutoSortOrder = null

  const restoredIds = restored.map((m) => m.id)
  const currentIds = props.cast.map((m) => m.id)
  if (JSON.stringify(restoredIds) !== JSON.stringify(currentIds)) {
    emit('cast-changed', restored)
  }
}
</script>

<template>
  <div>
    <FormCheckbox
      v-if="allowAutoSort"
      :id="autoSortId"
      :model-value="autoSort"
      as-switch
      title="autom. Sortierung"
      class="mb-2"
      @update:model-value="handleAutoSortToggle"
    />

    <draggable
      v-if="!autoSort"
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
                v-if="canReorder"
                class="fas fa-grip-vertical drag-handle c-grab p-1 me-2"
                title="ziehen zum Sortieren (am Handy: kurz gedrückt halten)"
              ></i>
              <i class="fas fa-times c-pointer" title="entfernen" @click="remove(element.id)"></i>

              <template v-if="canReorder">
                <i
                  v-if="index < cast.length - 1"
                  class="fas fa-arrow-down mx-1 c-pointer"
                  @click="move(index, 'down')"
                ></i>
                <i v-else class="fas fa-arrow-down mx-1" style="color: #ccc"></i>

                <i v-if="index > 0" class="fas fa-arrow-up c-pointer" @click="move(index, 'up')"></i>
                <i v-else class="fas fa-arrow-up" style="color: #ccc"></i>
              </template>
            </span>
            <span>{{ element.name }} ({{ element.fee }})</span>
          </small>
        </div>
      </template>
    </draggable>

    <div v-else class="d-flex flex-column gap-2">
      <div v-for="group in voiceGroups" :key="group.key">
        <small class="fw-bold text-muted d-block mb-1">{{ group.label }}</small>
        <div
          v-for="row in group.rows"
          :key="row.member.id"
          class="bg-body rounded px-2 py-1 shadow-sm mb-1"
        >
          <small :class="row.index < required ? ['text-success', 'fw-bold'] : ['text-info']">
            <span class="me-2">
              <i class="fas fa-times c-pointer" title="entfernen" @click="remove(row.member.id)"></i>
            </span>
            <span>{{ row.member.name }} ({{ row.member.fee }})</span>
          </small>
        </div>
      </div>
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
