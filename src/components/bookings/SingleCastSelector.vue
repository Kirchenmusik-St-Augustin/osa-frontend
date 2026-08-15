<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  BookableGroup,
  BookableUser,
  Fee,
  NotBookedEntry,
  PopularItem,
} from '@/composables/useBookings'
import MultiSelectDropdown, { type MultiSelectGroup } from './MultiSelectDropdown.vue'
import PopularModal from './PopularModal.vue'

// Port of Legacy's SingleCastSelectorComponent.vue -- candidate picker for
// one position: a collapsed "N ausgewählt" dropdown (MultiSelectDropdown,
// tabbed "Anfragen"/"direkt buchen") instead of two permanently-expanded
// candidate lists, a Fee preset dropdown, and the optional ⭐
// popular-bookings suggestion modal. The whole panel disappears once there
// is nobody left to pick (Legacy: `v-if="selectOptions.length"`).
const props = defineProps<{
  allBooked: BookableUser[]
  notBooked: NotBookedEntry[]
  bookable: BookableGroup
  fees: Fee[]
  popular?: PopularItem
  modalId: string
}>()

// voice_name/voice_order are only ever populated for choirjobs candidates
// (see booking_service._get_staff) -- carried straight through here so
// SingleCastList's auto-sort can place a freshly-added chorister into the
// correct group immediately, without a reload.
type Candidate = {
  id: number
  name: string
  fee: number
  voice_name?: string | null
  voice_order?: number | null
}

const emit = defineEmits<{
  'add-to': [payload: { stack: 'cast' | 'notBooked'; candidates: Candidate[] }]
}>()

// Default Fee id 3 stays hardcoded -- Phase 1 carries over the exact same
// Fee rows (and ids) from the same SQLite source Legacy uses, so this
// mirrors Legacy's own hardcoded selector default 1:1 (see
// project_osa_migration_plan memory, Schritt 6 plan B.2/B.3).
const DEFAULT_FEE_ID = 3

const selectedFeeId = ref<number>(
  props.fees.find((fee) => fee.id === DEFAULT_FEE_ID)?.id ?? props.fees[0]?.id ?? 0,
)
const selectedCandidateIds = ref<number[]>([])

const excludedIds = computed(() => {
  const ids = new Set<number>()
  for (const user of props.allBooked) ids.add(user.id)
  for (const user of props.notBooked) ids.add(user.id)
  return ids
})

const requestingOptions = computed(() =>
  props.bookable.requesting.filter((user) => !excludedIds.value.has(user.id)),
)
const otherOptions = computed(() =>
  props.bookable.other.filter((user) => !excludedIds.value.has(user.id)),
)

const selectGroups = computed((): MultiSelectGroup[] => {
  const groups: MultiSelectGroup[] = []
  if (requestingOptions.value.length) {
    groups.push({ label: 'Anfragen', values: requestingOptions.value })
  }
  if (otherOptions.value.length) {
    groups.push({ label: 'direkt buchen', values: otherOptions.value })
  }
  return groups
})

function candidatesFor(ids: number[]): Candidate[] {
  const allOptions = [...requestingOptions.value, ...otherOptions.value]
  const fee = props.fees.find((candidate) => candidate.id === selectedFeeId.value)?.amount ?? 0
  return ids
    .map((id) => allOptions.find((option) => option.id === id))
    .filter((option): option is BookableUser => option !== undefined)
    .map((option) => ({
      id: option.id,
      name: option.name,
      fee,
      voice_name: option.voice_name,
      voice_order: option.voice_order,
    }))
}

function addTo(stack: 'cast' | 'notBooked'): void {
  emit('add-to', { stack, candidates: candidatesFor(selectedCandidateIds.value) })
  selectedCandidateIds.value = []
}
</script>

<template>
  <div v-if="selectGroups.length" class="text-end">
    <div class="mb-2 text-primary">
      <button
        v-if="popular"
        type="button"
        class="btn btn-sm"
        data-bs-toggle="modal"
        :data-bs-target="`#popular${modalId}`"
        title="populäre Buchungen"
      >
        <i class="fas fa-star text-primary"></i>
      </button>
    </div>
    <PopularModal v-if="popular" :modal-id="modalId" :popular="popular" />

    <MultiSelectDropdown v-model="selectedCandidateIds" :options="selectGroups" />

    <div class="my-2">ausgewählte Personen:</div>
    <div class="mb-2">Entweder um</div>
    <div class="mb-2">
      <select v-model.number="selectedFeeId" class="form-select form-select-sm">
        <option v-for="fee in fees" :key="fee.id" :value="fee.id">
          {{ fee.amount }},- ({{ fee.name }})
        </option>
      </select>
    </div>
    <button
      type="button"
      class="btn btn-sm btn-primary mb-2"
      :disabled="!selectedCandidateIds.length"
      @click="addTo('cast')"
    >
      hinzufügen
    </button>
    <div class="my-2">...oder allfällige Anfragen</div>
    <button
      type="button"
      class="btn btn-sm btn-primary mb-2"
      :disabled="!selectedCandidateIds.length"
      @click="addTo('notBooked')"
    >
      zurückweisen
    </button>
  </div>
</template>
