<script setup lang="ts">
// 1:1 port of Legacy's Components/Common/FormElements/FormSelect.vue,
// simplified for TypeScript: instead of Legacy's dynamic optionsKey/
// optionsLabel lookup, call sites normalize their data to {id, label}
// up front (keeps this component fully typed, at the cost of one trivial
// .map() per call site -- CLAUDE.md's AHA principle over a generic,
// type-unsafe lookup). `readonly`/`small`/`titleSmall` added for Schritt 8
// (Scores) -- additive, defaults match every existing call site's
// current look.
export interface FormSelectOption {
  id: number
  label: string
}

const model = defineModel<number | null>({ required: true })

withDefaults(
  defineProps<{
    id: string
    title?: string
    titleSmall?: boolean
    options: FormSelectOption[]
    required?: boolean
    error?: string
    readonly?: boolean
    small?: boolean
  }>(),
  {
    title: undefined,
    titleSmall: false,
    required: false,
    error: '',
    readonly: false,
    small: false,
  },
)
</script>

<template>
  <div class="form-group">
    <label v-if="title" class="form-label" :for="id">
      <small v-if="titleSmall" class="text-black-50">{{ title }}</small>
      <strong v-else>{{ title }}</strong>
    </label>
    <select
      :id="id"
      v-model="model"
      class="form-select"
      :required="required"
      :disabled="readonly"
      :class="small ? ['form-select-sm'] : []"
    >
      <option v-for="option in options" :key="option.id" :value="option.id">
        {{ option.label }}
      </option>
    </select>
    <small class="text-danger">{{ error }}&nbsp;</small>
  </div>
</template>

<style scoped>
select:disabled {
  background-image: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-color: #f5f5f5;
}
</style>
