<script setup lang="ts">
// Generic single-field renderer driven entirely by the backend-served field
// config (see useScores.ts's ScoreFieldConfig): text, number and textarea
// fields render through FormInput, select fields through FormSelect (the
// configured string values double as option ids and labels).
import { computed } from 'vue'
import FormInput from '@/components/common/FormInput.vue'
import FormSelect from '@/components/common/FormSelect.vue'
import type { ScoreFieldConfig } from '@/composables/useScores'

const model = defineModel<string | number | null>({ required: true })

const props = withDefaults(
  defineProps<{
    name: string
    config?: ScoreFieldConfig
    withTitle?: boolean
    small?: boolean
    titleSmall?: boolean
    error?: string
    readonly?: boolean
    ariaLabel?: string
  }>(),
  {
    config: undefined,
    withTitle: false,
    small: false,
    titleSmall: false,
    error: '',
    readonly: false,
    ariaLabel: undefined,
  },
)

// A select field only ever holds one of its configured strings.
const selectModel = computed<string | null>({
  get: () => (model.value === null ? null : String(model.value)),
  set: (value) => {
    model.value = value
  },
})
const selectOptions = computed(() =>
  (props.config?.values ?? []).map((value) => ({ id: value, label: value })),
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
    :aria-label="ariaLabel"
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
    :aria-label="ariaLabel"
    :required="config.required"
    :max="config.length ?? undefined"
    type="textarea"
  />
  <FormSelect
    v-else-if="config?.kind === 'select'"
    :id="`score-field-${name}`"
    v-model="selectModel"
    :title="withTitle ? (config.label ?? undefined) : undefined"
    :options="selectOptions"
    :readonly="readonly"
    :small="small"
    :title-small="titleSmall"
    :error="error"
    :aria-label="ariaLabel"
  />
  <div v-else>
    <div class="fw-bold">Unknown type in config:</div>
    <pre>{{ config }}</pre>
  </div>
</template>
