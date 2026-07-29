<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import QuantitySetup, { type QuantitySetupEntry } from './QuantitySetup.vue'

export interface AvailablePosition {
  id: number
  name: string
}

// 1:1 port of Legacy's Components/Common/QuantityEditorComponent.vue --
// interactive setup editor used twice by Ordinariumwork's Form (once for
// instruments, once for voices). Relies on the PARENT having already
// fully loaded `modelValue` (e.g. from the Ordinariumwork's existing
// setup on edit) before this component is created -- like Legacy, whose
// server-rendered Inertia props are already complete at component-setup
// time, `setupOrig` below snapshots whatever `modelValue` holds the
// instant this runs, so the "reset to original values" link only works
// correctly once the caller gates rendering behind its own loading state.
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

const unused = ref(computeUnused())
const selectedUnused = ref<number | null>(unused.value[0]?.id ?? null)

watch(
  setup,
  () => {
    unused.value = computeUnused()
    selectedUnused.value = unused.value[0]?.id ?? null
  },
  { deep: true },
)

const setupChanged = computed(() => JSON.stringify(setup.value) !== JSON.stringify(setupOrig))

function add(): void {
  const item = props.available.find((candidate) => candidate.id === selectedUnused.value)
  if (!item) return
  setup.value = [...setup.value, { id: item.id, name: item.name, quantity: 1 }]
}

function remove(id: number): void {
  setup.value = setup.value.filter((item) => item.id !== id)
}

function modify(id: number, increase: boolean): void {
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
      <select
        v-if="unused.length"
        v-model.number="selectedUnused"
        class="form-select form-select-sm"
      >
        <option v-for="item in unused" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
      <div v-if="selectedUnused !== null" class="text-end">
        <button type="button" class="btn btn-primary btn-sm mt-2" @click="add">hinzufügen</button>
      </div>
      <div v-if="setupChanged" class="text-end mt-3 c-pointer">
        <small class="text-black-50" @click="reset">auf derz. Werte zurücksetzen</small>
      </div>
    </div>
  </div>
</template>
