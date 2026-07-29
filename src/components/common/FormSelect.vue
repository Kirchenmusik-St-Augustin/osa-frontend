<script setup lang="ts">
// 1:1 port of Legacy's Components/Common/FormElements/FormSelect.vue,
// simplified for TypeScript: instead of Legacy's dynamic optionsKey/
// optionsLabel lookup, call sites normalize their data to {id, label}
// up front (keeps this component fully typed, at the cost of one trivial
// .map() per call site -- CLAUDE.md's AHA principle over a generic,
// type-unsafe lookup).
export interface FormSelectOption {
  id: number
  label: string
}

const model = defineModel<number | null>({ required: true })

withDefaults(
  defineProps<{
    id: string
    title: string
    options: FormSelectOption[]
    required?: boolean
    error?: string
  }>(),
  {
    required: false,
    error: '',
  },
)
</script>

<template>
  <div class="form-group">
    <label class="form-label" :for="id"
      ><strong>{{ title }}</strong></label
    >
    <select :id="id" v-model="model" class="form-select" :required="required">
      <option v-for="option in options" :key="option.id" :value="option.id">
        {{ option.label }}
      </option>
    </select>
    <small class="text-danger">{{ error }}&nbsp;</small>
  </div>
</template>
