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
  'add-to': [
    itemId: number,
    stack: 'cast' | 'notBooked',
    candidates: { id: number; name: string; fee: number }[],
  ]
}>()

const open = ref(false)
const castOrig = JSON.parse(JSON.stringify(props.cast)) as CastMember[]

const castChanged = computed(() => JSON.stringify(props.cast) !== JSON.stringify(castOrig))

const badgeClass = computed(() => {
  if (props.cast.length === props.item.quantity) return 'text-bg-success'
  if (props.cast.length < props.item.quantity) return 'text-bg-danger'
  return 'text-bg-info'
})

function handleCastChanged(cast: CastMember[]): void {
  emit('cast-changed', props.item.id, cast)
}

function handleAddTo(payload: {
  stack: 'cast' | 'notBooked'
  candidates: { id: number; name: string; fee: number }[]
}): void {
  if (payload.stack === 'cast') {
    emit('cast-changed', props.item.id, [...props.cast, ...payload.candidates])
  } else {
    emit('add-to', props.item.id, 'notBooked', payload.candidates)
  }
}

function reset(): void {
  emit('cast-changed', props.item.id, JSON.parse(JSON.stringify(castOrig)) as CastMember[])
}
</script>

<template>
  <div class="list-group-item">
    <div class="d-flex justify-content-between c-pointer" @click="open = !open">
      <span>
        <i :class="open ? 'fas fa-caret-down' : 'fas fa-caret-right'"></i>
        <span class="ms-1">{{ item.name }}</span>
      </span>
      <span class="badge" :class="badgeClass">{{ cast.length }} / {{ item.quantity }}</span>
    </div>
    <div v-if="open" class="row mt-2">
      <div class="col-sm-6">
        <SingleCastList :cast="cast" :required="item.quantity" @cast-changed="handleCastChanged" />
      </div>
      <div class="col-sm-6">
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
      <div v-if="castChanged" class="text-end mt-2 c-pointer">
        <small class="text-black-50" @click="reset">auf derz. Werte zurücksetzen</small>
      </div>
    </div>
  </div>
</template>
