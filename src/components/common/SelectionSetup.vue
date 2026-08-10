<script setup lang="ts">
// 1:1 port of Legacy's Content/System/Users/Form/SelectionSetup.vue --
// assigns/removes Instrument/Voice/Choirjob/Role items on the User form
// (Schritt 7). Left column lists every `available` item, but only renders
// a removable row for ones currently in the model; right column has an
// "add" dropdown+button for the unused rest, plus a reset-to-last-saved
// link. No FormSelect.vue reuse here -- Legacy's own dropdown has no
// visible label above it, and FormSelect.vue always renders one.
import { computed, ref, watch } from 'vue'

export interface SelectableItem {
  id: number
  name: string
}

const model = defineModel<SelectableItem[]>({ required: true })

const props = defineProps<{
  title?: string
  available: SelectableItem[]
}>()

// Snapshot at mount, NOT reactively tracked afterward -- 1:1 Legacy's
// `cloneDeep(props.modelValue)` inside `reactive({...})`.
const savedValue: SelectableItem[] = model.value.map((item) => ({ ...item }))

const assignedIds = computed(() => new Set(model.value.map((item) => item.id)))
const unused = computed(() => props.available.filter((item) => !assignedIds.value.has(item.id)))

const selectedUnusedId = ref<number | null>(unused.value[0]?.id ?? null)
watch(
  unused,
  () => {
    selectedUnusedId.value = unused.value[0]?.id ?? null
  },
  { immediate: true },
)

function remove(id: number): void {
  model.value = model.value.filter((item) => item.id !== id)
}

function add(): void {
  const item = props.available.find((entry) => entry.id === selectedUnusedId.value)
  if (!item) return
  model.value = [...model.value, item]
}

function resetToSaved(): void {
  model.value = savedValue.map((item) => ({ ...item }))
}
</script>

<template>
  <div class="my-4">
    <strong v-if="props.title">{{ props.title }}</strong>
    <div class="row border rounded my-2 p-3 bg-light">
      <div class="col-sm-7 mb-3">
        <div v-for="item in props.available" :key="item.id" class="mb-1">
          <div v-if="assignedIds.has(item.id)" class="row">
            <div class="col-sm-12">
              <i
                class="c-pointer fas fa-trash me-2"
                title="entfernen"
                @click.prevent="remove(item.id)"
              ></i>
              <span>{{ item.name }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="col-sm-5">
        <div v-if="unused.length">
          <select v-model="selectedUnusedId" class="form-select mb-2">
            <option v-for="item in unused" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select>
          <div class="d-flex justify-content-between">
            <button type="button" class="btn btn-primary mb-3" @click.prevent="add">
              hinzufügen
            </button>
          </div>
        </div>
        <small class="c-pointer" @click="resetToSaved">Auf derz. gesp. Werte zurücksetzen</small>
      </div>
    </div>
  </div>
</template>
