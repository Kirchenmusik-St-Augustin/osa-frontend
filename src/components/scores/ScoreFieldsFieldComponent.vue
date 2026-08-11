<script setup lang="ts">
// 1:1 port of Legacy's Scores/ScoreFieldsFieldComponent.vue -- generic
// single-field renderer driven entirely by the backend-served field
// config (see useScores.ts's ScoreFieldConfig). Legacy's own FormSelect
// is generic enough to bind directly to a string value; our own
// FormSelect.vue was intentionally simplified to numeric {id,label}
// options for its existing (lookup-style) call sites (see its own
// docstring) and doesn't fit here, so "select" is rendered with a small
// local <select> instead of forcing that contract to also cover raw
// string values -- CLAUDE.md's AHA principle over a forced abstraction.
import FormInput from '@/components/common/FormInput.vue'
import type { ScoreFieldConfig } from '@/composables/useScores'

const model = defineModel<string | number | null>({ required: true })

withDefaults(
  defineProps<{
    name: string
    config?: ScoreFieldConfig
    withTitle?: boolean
    small?: boolean
    titleSmall?: boolean
    error?: string
    readonly?: boolean
  }>(),
  {
    config: undefined,
    withTitle: false,
    small: false,
    titleSmall: false,
    error: '',
    readonly: false,
  },
)
</script>

<template>
  <FormInput
    v-if="config?.kind === 'text' || config?.kind === 'number'"
    :id="`score-field-${name}`"
    v-model="model"
    :title="withTitle ? (config.label ?? undefined) : undefined"
    :readonly="readonly"
    :small="small"
    :title-small="titleSmall"
    :error="error"
    :required="config.required"
    :max="config.kind === 'number' ? 9999 : (config.length ?? undefined)"
    :type="config.kind === 'number' ? 'number' : 'text'"
  />
  <FormInput
    v-else-if="config?.kind === 'textarea'"
    :id="`score-field-${name}`"
    v-model="model"
    :title="withTitle ? (config.label ?? undefined) : undefined"
    :readonly="readonly"
    :small="small"
    :title-small="titleSmall"
    :error="error"
    :required="config.required"
    :max="config.length ?? undefined"
    type="textarea"
  />
  <div v-else-if="config?.kind === 'select'" class="form-group">
    <label v-if="withTitle && config.label" class="form-label" :for="`score-field-${name}`">
      <small v-if="titleSmall" class="text-black-50">{{ config.label }}</small>
      <strong v-else>{{ config.label }}</strong>
    </label>
    <select
      :id="`score-field-${name}`"
      v-model="model"
      class="form-select"
      :disabled="readonly"
      :class="small ? ['form-select-sm'] : []"
    >
      <option v-for="value in config.values ?? []" :key="value" :value="value">
        {{ value }}
      </option>
    </select>
    <small class="text-danger">{{ error }}&nbsp;</small>
  </div>
  <div v-else>
    <div class="fw-bold">Unknown type in config:</div>
    <pre>{{ config }}</pre>
  </div>
</template>

<style scoped>
/* 1:1 FormSelect.vue's own disabled styling -- without this, a readonly
   select (Show page) still renders its dropdown chevron even though it's
   disabled, a real pixel difference from Legacy's read-only Show page. */
select:disabled {
  background-image: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-color: #f5f5f5;
}
</style>
