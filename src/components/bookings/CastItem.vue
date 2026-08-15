<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  BookableGroup,
  BookableUser,
  CastMember,
  Fee,
  NotBookedEntry,
  PopularItem,
} from '@/composables/useBookings'
import SingleCastList from './SingleCastList.vue'
import SingleCastSelector from './SingleCastSelector.vue'

// 1:1 port of Legacy's CastItemComponent.vue -- one collapsible card per
// Instrument/Voice/Choirjob setup item, combining the current cast list
// with the candidate selector.

// voice_name/voice_order are only ever set for choirjobs candidates (see
// SingleCastSelector.vue's candidatesFor()) -- carried through here so a
// freshly-added chorister can be placed into the correct auto-sort group
// immediately, without a reload.
type CastCandidate = {
  id: number
  name: string
  fee: number
  voice_name?: string | null
  voice_order?: number | null
}

const props = defineProps<{
  type: 'instruments' | 'voices' | 'choirjobs'
  item: { id: number; name: string; quantity: number }
  cast: CastMember[]
  bookable: BookableGroup
  allBooked: BookableUser[]
  notBooked: NotBookedEntry[]
  fees: Fee[]
  popular?: PopularItem
}>()

const emit = defineEmits<{
  'cast-changed': [itemId: number, cast: CastMember[]]
  'add-to': [itemId: number, stack: 'cast' | 'notBooked', candidates: CastCandidate[]]
  'remove-not-booked': [id: number]
}>()

const open = ref(false)
const castOrig = JSON.parse(JSON.stringify(props.cast)) as CastMember[]

// Mirrors SingleCastList's own switch state via v-model:auto-sort -- stays
// false for instruments/voices (no switch rendered there at all).
const autoSortActive = ref(false)

const castChanged = computed(() => JSON.stringify(props.cast) !== JSON.stringify(castOrig))
// Resetting to the original values is meaningless while auto-sort is
// active: the order is derived from each member's Voice, not manually set,
// so the reset link is hidden regardless of castChanged.
const showReset = computed(() => castChanged.value && !autoSortActive.value)

const badgeClass = computed(() => {
  if (props.cast.length === props.item.quantity) return 'text-bg-success'
  if (props.cast.length < props.item.quantity) return 'text-bg-danger'
  return 'text-bg-info'
})

function handleCastChanged(cast: CastMember[]): void {
  emit('cast-changed', props.item.id, cast)
}

function handleAddTo(payload: { stack: 'cast' | 'notBooked'; candidates: CastCandidate[] }): void {
  if (payload.stack === 'cast') {
    emit('cast-changed', props.item.id, [...props.cast, ...payload.candidates])
  } else {
    emit('add-to', props.item.id, 'notBooked', payload.candidates)
  }
}

function reset(): void {
  emit('cast-changed', props.item.id, JSON.parse(JSON.stringify(castOrig)) as CastMember[])
}

function handleRemoveNotBooked(id: number): void {
  emit('remove-not-booked', id)
}
</script>

<template>
  <div class="list-group-item">
    <div class="d-flex justify-content-between c-pointer" @click="open = !open">
      <span>{{ item.name }}</span>
      <span class="badge" :class="badgeClass">{{ cast.length }} / {{ item.quantity }}</span>
    </div>
    <div v-show="open" class="card bg-info-subtle p-2 mt-2">
      <div class="row">
        <div class="col-sm-7 mt-1">
          <SingleCastList
            v-model:auto-sort="autoSortActive"
            :cast="cast"
            :required="item.quantity"
            :not-booked="notBooked"
            :allow-auto-sort="type === 'choirjobs'"
            @cast-changed="handleCastChanged"
            @remove-not-booked="handleRemoveNotBooked"
          />
        </div>
        <div class="col-sm-5 mt-1">
          <SingleCastSelector
            :all-booked="allBooked"
            :not-booked="notBooked"
            :bookable="bookable"
            :fees="fees"
            :popular="popular"
            :modal-id="`${type}-${item.id}`"
            @add-to="handleAddTo"
          />
        </div>
      </div>
      <div class="mt-3 small text-end c-pointer" :class="{ invisible: !showReset }">
        <small class="text-black-50" @click="reset">auf derz. Werte zurücksetzen</small>
      </div>
    </div>
  </div>
</template>
