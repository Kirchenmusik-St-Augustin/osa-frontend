<script setup lang="ts">
import { computed, ref } from 'vue'
import QuantitySetup, { type QuantitySetupEntry } from './QuantitySetup.vue'

export interface AvailablePosition {
  id: string
  name: string
}

// Interactive setup editor used twice by Ordinariumwork's Form (once for
// instruments, once for voices). Relies on the PARENT having already fully
// loaded `modelValue` (e.g. from the Ordinariumwork's existing setup on
// edit) before this component is created: `setupOrig` below snapshots
// whatever `modelValue` holds the instant this runs, so the "reset to
// original values" link only works correctly once the caller gates
// rendering behind its own loading state.
const setup = defineModel<QuantitySetupEntry[]>({ required: true })
const props = defineProps<{ available: AvailablePosition[] }>()

// Vue wraps array/object model values in a reactive Proxy, which
// structuredClone() cannot handle ("could not be cloned") -- a JSON
// round-trip is a safe, simple deep clone for this plain id/name/quantity
// data (no Dates/functions/cycles to worry about).
function cloneSetup(value: QuantitySetupEntry[]): QuantitySetupEntry[] {
  return JSON.parse(JSON.stringify(value)) as QuantitySetupEntry[]
}

const setupOrig = cloneSetup(setup.value)

function computeUnused(): AvailablePosition[] {
  const usedIds = new Set(setup.value.map((item) => item.id))
  return props.available.filter((item) => !usedIds.has(item.id))
}

const unused = computed(computeUnused)
const chosenUnused = ref<string | null>(null)
// The user's pick stays while it is still unused (changing another row's
// quantity must not reset the dropdown); otherwise the first unused item.
const selectedUnused = computed<string | null>({
  get: () =>
    unused.value.some((item) => item.id === chosenUnused.value)
      ? chosenUnused.value
      : (unused.value[0]?.id ?? null),
  set: (id) => {
    chosenUnused.value = id
  },
})

const setupChanged = computed(() => JSON.stringify(setup.value) !== JSON.stringify(setupOrig))

function add(): void {
  const item = props.available.find((candidate) => candidate.id === selectedUnused.value)
  if (!item) return
  const updated = [...setup.value, { id: item.id, name: item.name, quantity: 1 }]
  // Rebuilt in `available`'s canonical order, not insertion order. Entries
  // that `available` does not list (archived instruments/voices stay
  // assigned but are filtered out of the dropdown source) are kept after
  // them, never dropped: saving the form would otherwise delete them.
  const availableIds = new Set(props.available.map((candidate) => candidate.id))
  const known = props.available
    .map((candidate) => updated.find((entry) => entry.id === candidate.id))
    .filter((entry): entry is QuantitySetupEntry => entry !== undefined)
  const archived = updated.filter((entry) => !availableIds.has(entry.id))
  setup.value = [...known, ...archived]
}

function remove(id: string): void {
  setup.value = setup.value.filter((item) => item.id !== id)
}

function modify(id: string, increase: boolean): void {
  setup.value = setup.value
    .map((item) =>
      item.id === id ? { ...item, quantity: item.quantity + (increase ? 1 : -1) } : item,
    )
    .filter((item) => item.quantity >= 1)
}

function reset(): void {
  setup.value = cloneSetup(setupOrig)
}
</script>

<template>
  <div class="row">
    <div class="col-sm">
      <QuantitySetup :setup="setup" with-controls @modify="modify" @remove="remove" />
    </div>
    <div class="col-sm">
      <select v-if="unused.length" v-model="selectedUnused" class="form-select form-select-sm">
        <option v-for="item in unused" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
      <div v-if="selectedUnused !== null" class="text-end">
        <button type="button" class="btn btn-primary btn-sm mt-2" @click="add">hinzufügen</button>
      </div>
      <div v-if="setupChanged" class="text-end mt-3">
        <button
          type="button"
          class="btn btn-link btn-sm p-0 text-black-50 text-decoration-none"
          @click="reset"
        >
          auf derz. Werte zurücksetzen
        </button>
      </div>
    </div>
  </div>
</template>
