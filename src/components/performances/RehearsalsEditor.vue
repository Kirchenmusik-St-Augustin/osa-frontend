<script setup lang="ts">
import DateTimePicker from '@/components/common/DateTimePicker.vue'
import { toWallClockString } from '@/services/dateFormat'

export interface RehearsalEntry {
  schedule: string
  comment: string | null
}

// Rehearsals are keyed and removed by array index, not by value-matching
// `schedule`+`comment`: two rehearsals with the same timestamp would
// otherwise collide (Vue key clash) or get deleted together.
const rehearsals = defineModel<RehearsalEntry[]>({ required: true })

function tomorrowAt945(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 45, 0, 0)
  return toWallClockString(date)
}

function add(): void {
  rehearsals.value = [...rehearsals.value, { schedule: tomorrowAt945(), comment: '' }]
}

function remove(index: number): void {
  rehearsals.value = rehearsals.value.filter((_, i) => i !== index)
}

// Edits go into a copy of the list: the entries received from the parent are
// never mutated in place.
function update(index: number, changes: Partial<RehearsalEntry>): void {
  rehearsals.value = rehearsals.value.map((rehearsal, i) =>
    i === index ? { ...rehearsal, ...changes } : rehearsal,
  )
}

function updateComment(index: number, event: Event): void {
  update(index, { comment: (event.target as HTMLInputElement).value })
}
</script>

<template>
  <div>
    <strong class="my-2 d-block">
      <span>Proben</span>
      <button
        type="button"
        class="btn btn-link btn-sm p-0 ms-1 align-baseline"
        title="Probe hinzufügen"
        aria-label="Probe hinzufügen"
        @click="add"
      >
        <i class="fas fa-plus-circle" aria-hidden="true"></i>
      </button>
    </strong>
    <div v-for="(rehearsal, index) in rehearsals" :key="index" class="row mb-3">
      <div class="col-md-6">
        <div class="row">
          <div class="col-md-1">
            <button
              type="button"
              class="btn btn-link btn-sm p-0 ms-1 pt-2 text-reset"
              title="entfernen"
              aria-label="Probe entfernen"
              @click="remove(index)"
            >
              <i class="fas fa-trash" aria-hidden="true"></i>
            </button>
          </div>
          <div class="col-md-11">
            <DateTimePicker
              :model-value="rehearsal.schedule"
              @update:model-value="update(index, { schedule: $event })"
            />
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <input
          :value="rehearsal.comment"
          type="text"
          class="form-control"
          aria-label="Kommentar zur Probe"
          required
          @input="updateComment(index, $event)"
        />
      </div>
    </div>
  </div>
</template>
