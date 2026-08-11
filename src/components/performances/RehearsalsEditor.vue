<script setup lang="ts">
import DateTimePicker from '@/components/common/DateTimePicker.vue'
import { toWallClockString } from '@/services/dateFormat'

export interface RehearsalEntry {
  schedule: string
  comment: string | null
}

// 1:1 port of Legacy's Form/RehearsalsEditorComponent.vue, with one
// deliberate fix: Legacy keys `v-for` by `schedule` and removes rehearsals
// by value-matching `schedule`+`comment` -- two rehearsals with the same
// timestamp collide (Vue key clash) or get deleted together (an
// "offensichtliches Versehen", not a business rule). Using the array index
// for both `:key` and removal avoids that edge case without changing any
// user-visible behavior for the normal case.
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
</script>

<template>
  <div>
    <strong class="my-2 d-block">
      <span>Proben</span>
      <i class="c-pointer ms-1 fas fa-plus-circle" @click="add"></i>
    </strong>
    <div v-for="(rehearsal, index) in rehearsals" :key="index" class="row mb-3">
      <div class="col-md-6">
        <div class="row">
          <div class="col-md-1">
            <i
              class="c-pointer ms-1 fas fa-trash pt-2"
              title="entfernen"
              @click="remove(index)"
            ></i>
          </div>
          <div class="col-md-11">
            <DateTimePicker v-model="rehearsal.schedule" />
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <input v-model="rehearsal.comment" type="text" class="form-control" required />
      </div>
    </div>
  </div>
</template>
