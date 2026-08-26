<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PerformanceCard from '@/components/performances/PerformanceCard.vue'
import CastItem from '@/components/bookings/CastItem.vue'
import {
  useBookings,
  type BookableGroup,
  type CastFormData,
  type CastMember,
  type CastSavePayload,
  type PerformanceCastPage,
} from '@/composables/useBookings'
import { confirmAction, showToast } from '@/services/notifications'
import { parseWallClock } from '@/services/dateFormat'

// Port of Legacy's Cast.vue -- the disponent-only Besetzung/Casting page.
// Only disponent may reach this route at all (see router meta), so no
// separate cast-vs-view-only mode exists here. Legacy renders each position
// type as a literal (nested-table) HTML <table> with "Name"/"gebucht"
// column headers -- ported here as a plain header row above a list-group
// instead of a real <table> (verified live against
// osa.dev.schimpl.cc/content/music/performances/{id}/cast): same visible
// information and column labels, without copying Legacy's
// table-inside-a-table-cell markup.
const props = defineProps<{ id: string }>()
const performanceId = computed(() => Number(props.id))

const router = useRouter()
const { getCastPage, saveCast } = useBookings()

type PositionType = 'instruments' | 'voices' | 'choirjobs'
const POSITION_TYPES: readonly PositionType[] = ['instruments', 'voices', 'choirjobs']
const POSITION_LABELS: Record<PositionType, string> = {
  instruments: 'Instrumente',
  voices: 'Stimmen',
  choirjobs: 'Choraufgaben',
}

const page = ref<PerformanceCastPage | null>(null)
const form = reactive<CastFormData>({
  cast: { instruments: [], voices: [], choirjobs: [] },
  not_booked: [],
})
const formOrig = ref('')

// Vue-Proxy wrapped values can't go through structuredClone() -- a JSON
// round-trip is the established, simple deep-clone pattern for this plain
// id/name/fee data (1:1 QuantityEditor.vue's cloneSetup()).
function setForm(data: CastFormData): void {
  form.cast = JSON.parse(JSON.stringify(data.cast)) as CastFormData['cast']
  form.not_booked = JSON.parse(JSON.stringify(data.not_booked)) as CastFormData['not_booked']
  formOrig.value = JSON.stringify(form)
}

onMounted(async () => {
  page.value = await getCastPage(performanceId.value)
  setForm(page.value.form_data)
})

const castChanged = computed(() => JSON.stringify(form) !== formOrig.value)

// Legacy's "zurück" AND a successful "speichern" both go to the calendar
// month of the performance's own schedule (PerformanceController::cast()/
// saveCast() `to_route('...performances.index', ['year' => ..., 'month' =>
// ...])`) -- never to the performance's own show/detail page.
const backTarget = computed(() => {
  if (!page.value) return { name: 'home' as const }
  const scheduleDate = parseWallClock(page.value.schedule)
  return {
    name: 'home' as const,
    query: { year: scheduleDate.getFullYear(), month: scheduleDate.getMonth() + 1 },
  }
})

const allBooked = computed((): { id: number; name: string }[] => {
  const all: { id: number; name: string }[] = []
  for (const type of POSITION_TYPES) {
    for (const item of form.cast[type]) {
      for (const member of item.cast) all.push({ id: member.id, name: member.name })
    }
  }
  return all
})

interface DisplayItem {
  id: number
  name: string
  quantity: number
  cast: CastMember[]
}

function itemsFor(type: PositionType): DisplayItem[] {
  if (!page.value) return []
  const quantityById = new Map(page.value.setup[type].map((entry) => [entry.id, entry.quantity]))
  return form.cast[type].map((item) => ({
    id: item.id,
    name: item.name,
    quantity: quantityById.get(item.id) ?? 0,
    cast: item.cast,
  }))
}

function bookableFor(type: PositionType, itemId: number): BookableGroup {
  const fallback: BookableGroup = { requesting: [], other: [] }
  return page.value?.staff[type].find((entry) => entry.id === itemId)?.bookable ?? fallback
}

function popularFor(type: PositionType, itemId: number) {
  if (type === 'choirjobs') return undefined // always empty, see backend booking_service._get_popular
  return page.value?.popular[type][String(itemId)]
}

function handleCastChanged(type: PositionType, itemId: number, cast: CastMember[]): void {
  const section = form.cast[type]
  const index = section.findIndex((item) => item.id === itemId)
  if (index === -1) return
  section[index] = { ...section[index]!, cast }
}

function handleAddTo(
  _itemId: number,
  stack: 'cast' | 'notBooked',
  candidates: { id: number; name: string; fee: number }[],
): void {
  if (stack !== 'notBooked') return
  for (const candidate of candidates) {
    if (!form.not_booked.some((entry) => entry.id === candidate.id)) {
      form.not_booked.push({ id: candidate.id, name: candidate.name })
    }
  }
}

function removeNotBooked(id: number): void {
  form.not_booked = form.not_booked.filter((entry) => entry.id !== id)
}

async function save(): Promise<void> {
  const confirmed = await confirmAction('Wirklich speichern?')
  if (!confirmed) return

  const payload: CastSavePayload = {
    cast: {
      instruments: form.cast.instruments.map((item) => ({
        id: item.id,
        cast: item.cast.map((member) => ({ id: member.id, fee: member.fee })),
      })),
      voices: form.cast.voices.map((item) => ({
        id: item.id,
        cast: item.cast.map((member) => ({ id: member.id, fee: member.fee })),
      })),
      choirjobs: form.cast.choirjobs.map((item) => ({
        id: item.id,
        cast: item.cast.map((member) => ({ id: member.id, fee: member.fee })),
      })),
    },
    not_booked: form.not_booked.map((entry) => ({ id: entry.id })),
  }

  try {
    await saveCast(performanceId.value, payload)
    showToast('gespeichert.')
    await router.push(backTarget.value)
  } catch {
    showToast('Ein Fehler ist aufgetreten.', true)
  }
}

function reset(): void {
  // Reset to the currently *saved* values, not the page's original load
  // state -- formOrig is kept current on every setForm() call (initial
  // load AND after a successful save), while page.value.form_data is only
  // ever set once at mount and would silently fall back to the pre-save
  // state after the first save.
  if (formOrig.value) setForm(JSON.parse(formOrig.value) as CastFormData)
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Besetzung bearbeiten</h2>

  <div v-if="page" class="row justify-content-center mt-4">
    <div class="col-md-11 col-xl-10 px-0 px-md-3 justify-content-center">
      <PerformanceCard
        :performance="{
          id: page.id,
          schedule: page.schedule,
          location: page.location,
          ordinariumwork_name: page.ordinariumwork_name,
          ordinariumwork_artist_name: page.ordinariumwork_artist_name,
          ordinariumwork_demanding: false,
          artist_name: page.artist_name,
          proprium: [],
          demanding_proprium: page.demanding_proprium,
          rehearsals: page.rehearsals,
        }"
      />

      <div class="text-center my-3">
        <RouterLink class="btn btn-primary mx-2" :to="backTarget"> zurück </RouterLink>
        <button type="button" class="btn btn-danger mx-2" :disabled="!castChanged" @click="save">
          speichern
        </button>
      </div>
      <div class="text-center mb-3 c-pointer" :class="{ invisible: !castChanged }">
        <small class="text-black-50" @click="reset"
          >alles auf derzeit gespeicherte Werte zurücksetzen</small
        >
      </div>

      <div v-for="type in POSITION_TYPES" :key="type" class="mb-4">
        <div class="h4 text-center mb-4">{{ POSITION_LABELS[type] }}</div>
        <div v-if="itemsFor(type).length" class="d-flex justify-content-between fw-bold px-2 mb-1">
          <span>Name</span>
          <span>gebucht</span>
        </div>
        <div class="list-group">
          <CastItem
            v-for="item in itemsFor(type)"
            :key="item.id"
            :type="type"
            :item="{ id: item.id, name: item.name, quantity: item.quantity }"
            :cast="item.cast"
            :bookable="bookableFor(type, item.id)"
            :all-booked="allBooked"
            :not-booked="form.not_booked"
            :fees="page.fees"
            :popular="popularFor(type, item.id)"
            @cast-changed="(itemId, cast) => handleCastChanged(type, itemId, cast)"
            @add-to="handleAddTo"
            @remove-not-booked="removeNotBooked"
          />
        </div>
      </div>
    </div>
  </div>
</template>
