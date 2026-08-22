<script setup lang="ts">
import { computed, onMounted, reactive, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal } from 'bootstrap'
import DateTimePicker from '@/components/common/DateTimePicker.vue'
import FormSelect, { type FormSelectOption } from '@/components/common/FormSelect.vue'
import FormInput from '@/components/common/FormInput.vue'
import QuantityEditor from '@/components/common/QuantityEditor.vue'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'
import PropriumSetup from '@/components/performances/PropriumSetup.vue'
import RehearsalsEditor from '@/components/performances/RehearsalsEditor.vue'
import { useOrdinariumworks } from '@/composables/useOrdinariumworks'
import { usePropriumworks, type Propriumwork } from '@/composables/usePropriumworks'
import {
  usePerformances,
  type PerformanceAvailableData,
  type PerformancePropriumItem,
  type PerformancePayload,
  type PositionEntry,
} from '@/composables/usePerformances'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'
import { formatDateTime, parseWallClock, toWallClockString } from '@/services/dateFormat'

const props = defineProps<{ id?: string }>()
const route = useRoute()
const router = useRouter()

const { getAvailableData, getFormData, create, update, remove } = usePerformances()
const { search: searchOrdinariumworks, get: getOrdinariumwork, getSetup } = useOrdinariumworks()
const { search: searchPropriumworks, get: getPropriumwork } = usePropriumworks()

const ready = ref(false)
const submitting = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const deletable = ref(false)
const backYear = ref(new Date().getFullYear())
const backMonth = ref(new Date().getMonth() + 1)
const showSetup = ref(false)
const showBilling = ref(false)

const form = reactive({
  schedule: '',
  location_id: null as number | null,
  ordinariumwork: null as { id: number; label: string } | null,
  artist_id: null as number | null,
  description: '' as string | null,
  choirjob_defaultfee: 35 as number | string,
  instrument_defaultfee: 60 as number | string,
  voice_defaultfee: 110 as number | string,
  extracost_amount: null as number | string | null,
  extracost_description: '' as string | null,
  setup: {
    instruments: [] as PositionEntry[],
    voices: [] as PositionEntry[],
    choirjobs: [] as PositionEntry[],
  },
  proprium: [] as PerformancePropriumItem[],
  rehearsals: [] as { schedule: string; comment: string | null }[],
})

const available = ref<PerformanceAvailableData>({
  conductors: [],
  instruments: [],
  voices: [],
  choirjobs: [],
  locations: [],
  propriumelements: [],
})

const locationOptions = computed<FormSelectOption[]>(() =>
  available.value.locations.map((location) => ({ id: location.id, label: location.name })),
)
const conductorOptions = computed<FormSelectOption[]>(() =>
  available.value.conductors.map((conductor) => ({ id: conductor.id, label: conductor.name })),
)

const subtitle = computed(() => {
  if (!form.schedule || form.location_id === null) return null
  const location = available.value.locations.find((item) => item.id === form.location_id)
  if (!location) return null
  return `${formatDateTime(form.schedule)}, ${location.name}`
})

function toInt(value: unknown, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  return Number.isInteger(parsed) ? parsed : fallback
}

function nextSundayElevenAm(year: number, month: number): string {
  const now = new Date()
  const isCurrentOrPast =
    year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth() + 1)
  const base = isCurrentOrPast ? now : new Date(year, month - 1, 1)
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7 || 7))
  date.setHours(11, 0, 0, 0)
  return toWallClockString(date)
}

onMounted(async () => {
  available.value = await getAvailableData()

  if (props.id) {
    try {
      const formData = await getFormData(Number(props.id))
      deletable.value = formData.deletable
      form.schedule = formData.schedule
      form.location_id = formData.location_id
      form.ordinariumwork = { id: formData.ordinariumwork_id, label: formData.ordinariumwork_label }
      form.artist_id = formData.artist_id
      form.description = formData.description
      form.choirjob_defaultfee = formData.choirjob_defaultfee
      form.instrument_defaultfee = formData.instrument_defaultfee
      form.voice_defaultfee = formData.voice_defaultfee
      form.extracost_amount = formData.extracost_amount
      form.extracost_description = formData.extracost_description
      form.setup = formData.setup
      form.proprium = formData.proprium
      form.rehearsals = formData.rehearsals
      const scheduleDate = parseWallClock(formData.schedule)
      backYear.value = scheduleDate.getFullYear()
      backMonth.value = scheduleDate.getMonth() + 1
    } catch {
      showToast('Ein Fehler ist aufgetreten.', true)
      await router.push({ name: 'home' })
      return
    }
  } else {
    const queryYear = toInt(route.query['year'], new Date().getFullYear())
    const queryMonth = toInt(route.query['month'], new Date().getMonth() + 1)
    backYear.value = queryYear
    backMonth.value = queryMonth
    form.schedule = nextSundayElevenAm(queryYear, queryMonth)
  }
  ready.value = true
})

// -- Ordinarium-Komposition selector modal ----------------------------------
// Note: the plain Modal instance below must NOT be named "ordinariumworkModal"
// -- <script setup> auto-exposes every top-level binding to the template,
// and that name is already claimed by the `ref="ordinariumworkModal"` /
// useTemplateRef() pair, which would otherwise collide (Vue warns "Template
// ref used on a non-ref value" and the ref silently stops working).
const ordinariumworkModalEl = useTemplateRef<HTMLDivElement>('ordinariumworkModal')
let ordinariumworkModalInstance: Modal | null = null

onMounted(() => {
  if (ordinariumworkModalEl.value) {
    ordinariumworkModalInstance = new Modal(ordinariumworkModalEl.value, {
      backdrop: 'static',
      keyboard: false,
    })
  }
})

// Reset-baseline key for the instruments/voices QuantityEditor instances.
// QuantityEditor snapshots its own v-model at creation time to power its
// "reset to original values" link (see its header comment). Forcing a
// remount via :key re-triggers that snapshot on demand:
//  - editing (props.id set): stays constant regardless of Ordinariumwork
//    swaps, so the baseline stays pinned to the persisted performance's
//    setup loaded in onMounted -- swapping the Ordinariumwork mid-edit
//    must NOT change what "reset" means.
//  - creating (props.id unset): tracks the selected Ordinariumwork's id
//    (or an "unselected" sentinel before any pick), so every swap
//    re-anchors the baseline to the newly selected work's setup -- there
//    is no persisted performance to fall back to yet.
// choirjobs intentionally has no key: selectOrdinariumwork() never touches
// form.setup.choirjobs, so it must never re-baseline on Ordinariumwork
// changes either.
const setupBaselineKey = computed(() =>
  props.id ? 'persisted' : (form.ordinariumwork?.id ?? 'unselected'),
)

async function selectOrdinariumwork(id: number): Promise<void> {
  const [work, setup] = await Promise.all([getOrdinariumwork(id), getSetup(id)])
  form.ordinariumwork = { id: work.id, label: `${work.artist_name}: ${work.name}` }
  // Choirjobs are deliberately left untouched -- Ordinariumworks have no
  // choirjob positions at all (1:1 Legacy's setOrdinariumwork()).
  form.setup.instruments = setup.instruments
  form.setup.voices = setup.voices
  ordinariumworkModalInstance?.hide()
}

// -- Proprium editor modal --------------------------------------------------
const propriumModalEl = useTemplateRef<HTMLDivElement>('propriumModal')
let propriumModalInstance: Modal | null = null

onMounted(() => {
  if (propriumModalEl.value) {
    propriumModalInstance = new Modal(propriumModalEl.value, {
      backdrop: 'static',
      keyboard: false,
    })
  }
})

const unusedPropriumelements = computed(() =>
  available.value.propriumelements.filter(
    (element) => !form.proprium.some((item) => item.propriumelement_id === element.id),
  ),
)
const selectedPropriumelementId = ref<number | null>(null)
const selectedPropriumwork = ref<Propriumwork | null>(null)

function openPropriumModal(): void {
  selectedPropriumelementId.value = unusedPropriumelements.value[0]?.id ?? null
  selectedPropriumwork.value = null
  propriumModalInstance?.show()
}

function resetPropriumModal(): void {
  selectedPropriumelementId.value = null
  selectedPropriumwork.value = null
  propriumModalInstance?.hide()
}

async function onSelectPropriumwork(id: number): Promise<void> {
  selectedPropriumwork.value = await getPropriumwork(id)
}

function addPropriumelement(): void {
  const element = available.value.propriumelements.find(
    (item) => item.id === selectedPropriumelementId.value,
  )
  const work = selectedPropriumwork.value
  if (!element || !work) return

  const newItem: PerformancePropriumItem = {
    propriumelement_id: element.id,
    propriumelement_name: element.name,
    propriumwork_id: work.id,
    propriumwork_name: work.name,
    artist_name: work.artist_name,
    description: work.description,
    demanding: work.demanding,
  }
  // Rebuilt in the propriumelements' canon order, not insertion order --
  // 1:1 Legacy's addPropriumelement().
  const updated = [...form.proprium, newItem]
  form.proprium = available.value.propriumelements
    .map((candidate) => updated.find((item) => item.propriumelement_id === candidate.id))
    .filter((item): item is PerformancePropriumItem => item !== undefined)
  resetPropriumModal()
}

function removePropriumelement(item: PerformancePropriumItem): void {
  form.proprium = form.proprium.filter(
    (entry) => entry.propriumelement_id !== item.propriumelement_id,
  )
}

// -- Save / delete -----------------------------------------------------------
function toNullableNumber(value: number | string | null): number | null {
  if (value === '' || value === null) return null
  return Number(value)
}

function buildPayload(): PerformancePayload {
  return {
    schedule: form.schedule,
    location_id: form.location_id as number,
    ordinariumwork_id: form.ordinariumwork!.id,
    artist_id: form.artist_id,
    description: form.description || null,
    choirjob_defaultfee: Number(form.choirjob_defaultfee),
    instrument_defaultfee: Number(form.instrument_defaultfee),
    voice_defaultfee: Number(form.voice_defaultfee),
    extracost_amount: toNullableNumber(form.extracost_amount),
    extracost_description: form.extracost_description || null,
    setup: {
      instruments: form.setup.instruments.map(({ id, quantity }) => ({ id, quantity })),
      voices: form.setup.voices.map(({ id, quantity }) => ({ id, quantity })),
      choirjobs: form.setup.choirjobs.map(({ id, quantity }) => ({ id, quantity })),
    },
    proprium: form.proprium.map((item) => ({
      propriumelement_id: item.propriumelement_id,
      propriumwork_id: item.propriumwork_id,
    })),
    rehearsals: form.rehearsals.map((rehearsal) => ({
      schedule: rehearsal.schedule,
      comment: rehearsal.comment || null,
    })),
  }
}

async function save(): Promise<void> {
  const confirmed = await confirmAction('Wirklich speichern?')
  if (!confirmed) return

  submitting.value = true
  fieldErrors.value = {}
  try {
    const payload = buildPayload()
    const saved = props.id ? await update(Number(props.id), payload) : await create(payload)
    showToast('gespeichert.')
    const savedDate = parseWallClock(saved.schedule)
    await router.push({
      name: 'home',
      query: { year: savedDate.getFullYear(), month: savedDate.getMonth() + 1 },
    })
  } catch (error) {
    fieldErrors.value = extractApiErrors(error).fieldErrors
    showToast('Ein Fehler ist aufgetreten.', true)
  } finally {
    submitting.value = false
  }
}

async function destroy(): Promise<void> {
  if (!props.id) return
  const confirmed = await confirmAction('Wirklich löschen?')
  if (!confirmed) return

  try {
    await remove(Number(props.id))
    showToast('gelöscht.')
    await router.push({ name: 'home', query: { year: backYear.value, month: backMonth.value } })
  } catch {
    showToast('Ein Fehler ist aufgetreten.', true)
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Aufführung bearbeiten</h2>

  <div v-if="ready" class="row justify-content-center mt-4">
    <div class="col-md-8">
      <div v-if="subtitle" class="h4 text-center mb-4">{{ subtitle }}</div>

      <div class="card p-4 text-left">
        <strong class="my-2 d-block">Datum und Uhrzeit auswählen</strong>
        <DateTimePicker v-model="form.schedule" />
        <small class="text-danger">{{ fieldErrors['schedule'] }}&nbsp;</small>

        <FormSelect
          id="performance-location"
          v-model="form.location_id"
          title="Ort"
          :options="locationOptions"
          :error="fieldErrors['location_id']"
        />

        <strong class="my-2 d-block">Ordinarium-Komposition</strong>
        <div v-if="form.ordinariumwork" class="border rounded p-2 mb-1">
          {{ form.ordinariumwork.label }}
        </div>
        <small
          class="text-black-50 c-pointer"
          data-bs-toggle="modal"
          data-bs-target="#ordinariumworkModal"
        >
          Ordinarium-Komposition auswählen
        </small>
        <small class="text-danger d-block">{{ fieldErrors['ordinariumwork_id'] }}&nbsp;</small>

        <FormSelect
          id="performance-artist"
          v-model="form.artist_id"
          title="Dirigent"
          :options="conductorOptions"
          :error="fieldErrors['artist_id']"
        />

        <FormInput
          id="performance-description"
          v-model="form.description"
          title="Beschreibung"
          type="textarea"
          :error="fieldErrors['description']"
        />

        <strong class="my-2 d-block">
          <span>Proprium</span>
          <i class="c-pointer ms-1 fas fa-plus-circle" @click="openPropriumModal"></i>
        </strong>
        <PropriumSetup
          :proprium="form.proprium"
          with-controls
          @remove-element="removePropriumelement"
        />
        <small class="text-danger">{{ fieldErrors['proprium'] }}&nbsp;</small>

        <RehearsalsEditor v-model="form.rehearsals" />
        <small class="text-danger">{{ fieldErrors['rehearsals'] }}&nbsp;</small>

        <div class="my-2 c-pointer" @click="showSetup = !showSetup">
          <span class="me-2"
            ><i :class="showSetup ? 'fas fa-chevron-down' : 'fas fa-chevron-right'"></i
          ></span>
          <strong>Positionskonfiguration</strong>
        </div>
        <div v-if="showSetup" class="border rounded p-3 bg-info-subtle">
          <strong class="mt-5 d-block mb-3">Instrumente</strong>
          <QuantityEditor
            :key="setupBaselineKey"
            v-model="form.setup.instruments"
            :available="available.instruments"
          />

          <strong class="mt-2 d-block mb-3">Stimmen</strong>
          <QuantityEditor
            :key="setupBaselineKey"
            v-model="form.setup.voices"
            :available="available.voices"
          />

          <strong class="mt-2 d-block mb-3">Chor-Aufgaben</strong>
          <QuantityEditor v-model="form.setup.choirjobs" :available="available.choirjobs" />
          <small class="text-danger">{{ fieldErrors['setup'] }}&nbsp;</small>
        </div>

        <div class="my-2 c-pointer" @click="showBilling = !showBilling">
          <span class="me-2"
            ><i :class="showBilling ? 'fas fa-chevron-down' : 'fas fa-chevron-right'"></i
          ></span>
          <strong>Verrechnungsdetails</strong>
        </div>
        <div v-if="showBilling" class="mt-2 border rounded p-3 bg-info-subtle">
          <div class="mb-2 fw-semibold">Verrechnung offener Stellen</div>
          <div>
            Diese Zahlen dienen lediglich für die Berechnung von nichtbesetzten Stellen in der
            Abrechnung.<br />
            Bei der Einteilung ist für jeden Mitwirkenden der tatsächliche Tarif auszuwählen.
          </div>
          <div class="row mt-4">
            <div class="col-md-4">
              <div>Instrumente:</div>
              <div class="input-group">
                <span class="input-group-text">€</span>
                <input
                  v-model.number="form.instrument_defaultfee"
                  type="number"
                  min="0"
                  class="form-control"
                />
              </div>
            </div>
            <div class="col-md-4">
              <div>Stimmen:</div>
              <div class="input-group">
                <span class="input-group-text">€</span>
                <input
                  v-model.number="form.voice_defaultfee"
                  type="number"
                  min="0"
                  class="form-control"
                />
              </div>
            </div>
            <div class="col-md-4">
              <div>Choraufgaben:</div>
              <div class="input-group">
                <span class="input-group-text">€</span>
                <input
                  v-model.number="form.choirjob_defaultfee"
                  type="number"
                  min="0"
                  class="form-control"
                />
              </div>
            </div>
          </div>
          <div class="mt-4 mb-2 fw-semibold">Zusatzkosten</div>
          <div class="row mt-4">
            <div class="col-md-4">
              <div>Betrag:</div>
              <div class="input-group">
                <span class="input-group-text">€</span>
                <input
                  v-model.number="form.extracost_amount"
                  type="number"
                  min="0"
                  class="form-control"
                />
              </div>
            </div>
            <div class="col-md-8">
              <div>Beschreibung:</div>
              <input v-model="form.extracost_description" type="text" class="form-control" />
            </div>
          </div>
        </div>
      </div>

      <div class="text-center my-4">
        <div class="my-3">
          <button
            type="button"
            class="btn btn-primary mx-2"
            :disabled="submitting || !form.ordinariumwork?.id"
            @click="save"
          >
            speichern
          </button>
          <button
            v-if="props.id"
            type="button"
            class="btn btn-danger mx-2"
            :disabled="!deletable"
            :title="!deletable ? 'Es liegen noch Buchungen vor' : ''"
            @click="destroy"
          >
            löschen
          </button>
        </div>
        <div class="my-3">
          <RouterLink
            class="btn btn-secondary"
            :to="{ name: 'home', query: { year: backYear, month: backMonth } }"
          >
            zurück
          </RouterLink>
        </div>
      </div>
    </div>
  </div>

  <div id="ordinariumworkModal" ref="ordinariumworkModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content pt-3">
        <div class="modal-body">
          <div class="fw-bold mb-2">Ordinarium-Komposition suchen</div>
          <SearchTypeahead :search="searchOrdinariumworks" @select="selectOrdinariumwork" />
        </div>
      </div>
    </div>
  </div>

  <div id="propriumModal" ref="propriumModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-body">
          <select v-model="selectedPropriumelementId" class="form-select mb-3">
            <option v-for="element in unusedPropriumelements" :key="element.id" :value="element.id">
              {{ element.name }}
            </option>
          </select>
          <div v-if="selectedPropriumwork" class="form-control">
            {{ selectedPropriumwork.artist_name }}: {{ selectedPropriumwork.name }}
          </div>
          <SearchTypeahead v-else :search="searchPropriumworks" @select="onSelectPropriumwork" />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="resetPropriumModal">
            Abbrechen
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!selectedPropriumelementId || !selectedPropriumwork"
            @click="addPropriumelement"
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
