<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  BookableGroup,
  BookableUser,
  Fee,
  NotBookedEntry,
  PopularItem,
} from '@/composables/useBookings'
import PopularModal from './PopularModal.vue'

// Port of Legacy's SingleCastSelectorComponent.vue -- candidate picker for
// one position, split into "Anfragen" (users who requested this
// performance) and "direkt buchen" (everyone else qualified), a Fee preset
// dropdown, and the optional ⭐ popular-bookings suggestion modal.
const props = defineProps<{
  allBooked: BookableUser[]
  notBooked: NotBookedEntry[]
  bookable: BookableGroup
  fees: Fee[]
  popular?: PopularItem
  modalId: string
}>()

const emit = defineEmits<{
  'add-to': [
    payload: {
      stack: 'cast' | 'notBooked'
      candidates: { id: number; name: string; fee: number }[]
    },
  ]
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

function toggleCandidate(id: number): void {
  selectedCandidateIds.value = selectedCandidateIds.value.includes(id)
    ? selectedCandidateIds.value.filter((candidateId) => candidateId !== id)
    : [...selectedCandidateIds.value, id]
}

function candidatesFor(ids: number[]): { id: number; name: string; fee: number }[] {
  const allOptions = [...requestingOptions.value, ...otherOptions.value]
  const fee = props.fees.find((candidate) => candidate.id === selectedFeeId.value)?.amount ?? 0
  return ids
    .map((id) => allOptions.find((option) => option.id === id))
    .filter((option): option is BookableUser => option !== undefined)
    .map((option) => ({ id: option.id, name: option.name, fee }))
}

function addTo(stack: 'cast' | 'notBooked'): void {
  emit('add-to', { stack, candidates: candidatesFor(selectedCandidateIds.value) })
  selectedCandidateIds.value = []
}
</script>

<template>
  <div>
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
    <PopularModal v-if="popular" :modal-id="modalId" :popular="popular" />

    <div class="row">
      <div class="col-sm-6">
        <small class="text-black-50">Anfragen</small>
        <div v-for="user in requestingOptions" :key="user.id" class="form-check">
          <input
            :id="`cast-candidate-requesting-${user.id}`"
            class="form-check-input"
            type="checkbox"
            :checked="selectedCandidateIds.includes(user.id)"
            @change="toggleCandidate(user.id)"
          />
          <label class="form-check-label" :for="`cast-candidate-requesting-${user.id}`">
            {{ user.name }}
          </label>
        </div>
      </div>
      <div class="col-sm-6">
        <small class="text-black-50">direkt buchen</small>
        <div v-for="user in otherOptions" :key="user.id" class="form-check">
          <input
            :id="`cast-candidate-other-${user.id}`"
            class="form-check-input"
            type="checkbox"
            :checked="selectedCandidateIds.includes(user.id)"
            @change="toggleCandidate(user.id)"
          />
          <label class="form-check-label" :for="`cast-candidate-other-${user.id}`">
            {{ user.name }}
          </label>
        </div>
      </div>
    </div>

    <select v-model.number="selectedFeeId" class="form-select form-select-sm mt-2">
      <option v-for="fee in fees" :key="fee.id" :value="fee.id">
        {{ fee.amount }},- ({{ fee.name }})
      </option>
    </select>

    <div class="text-end mt-2">
      <button
        type="button"
        class="btn btn-secondary btn-sm me-2"
        :disabled="!selectedCandidateIds.length"
        @click="addTo('notBooked')"
      >
        zurückweisen
      </button>
      <button
        type="button"
        class="btn btn-primary btn-sm"
        :disabled="!selectedCandidateIds.length"
        @click="addTo('cast')"
      >
        hinzufügen
      </button>
    </div>
  </div>
</template>
