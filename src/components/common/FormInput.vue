<script setup lang="ts">
// 1:1 port of Legacy's Components/Common/FormElements/FormInput.vue
// (label + input/textarea + reserved-space error line) -- a shared
// primitive used by every future admin form, not just Coreelement's.
// `number` type added for Schritt 4 (Artist birthyear/deathyear,
// Ordinariumwork/Propriumwork duration) -- Legacy's FormInput defaults
// `min` to 0 for every number input regardless of field semantics, kept
// here for the same 1:1 reason. `readonly`/`small`/`titleSmall` added for
// Schritt 8 (Scores) -- its generic, config-driven field grid is the
// first caller needing Legacy's read-only Show variant and its compact
// "small" inputs; both are additive and default to Legacy's normal look,
// so every existing call site is unaffected. `autocomplete` is passed
// through to the real form control explicitly -- the single root <div>
// swallows attribute fallthrough -- so password fields can tell password
// managers whether to fill an existing or propose a new password.
const model = defineModel<string | number | null>({ required: true })

withDefaults(
  defineProps<{
    id: string
    title?: string
    titleSmall?: boolean
    type?: 'text' | 'textarea' | 'number' | 'email' | 'tel' | 'password'
    required?: boolean
    error?: string
    min?: number
    max?: number
    readonly?: boolean
    small?: boolean
    autocomplete?: string
  }>(),
  {
    title: undefined,
    titleSmall: false,
    type: 'text',
    required: false,
    error: '',
    min: 0,
    max: undefined,
    readonly: false,
    small: false,
    autocomplete: undefined,
  },
)
</script>

<template>
  <div class="form-group">
    <label v-if="title" class="form-label" :for="id">
      <small v-if="titleSmall" class="text-black-50">{{ title }}</small>
      <strong v-else>{{ title }}</strong>
    </label>
    <textarea
      v-if="type === 'textarea'"
      :id="id"
      v-model="model"
      class="form-control"
      rows="3"
      :required="required"
      :readonly="readonly"
      :disabled="readonly"
      :maxlength="max"
      :autocomplete="autocomplete"
    ></textarea>
    <input
      v-else-if="type === 'number'"
      :id="id"
      v-model.number="model"
      class="form-control"
      type="number"
      :min="min"
      :max="max"
      :required="required"
      :readonly="readonly"
      :disabled="readonly"
      :autocomplete="autocomplete"
      :class="small ? ['form-control-sm'] : []"
    />
    <input
      v-else
      :id="id"
      v-model="model"
      class="form-control"
      :type="type"
      :required="required"
      :readonly="readonly"
      :disabled="readonly"
      :maxlength="max"
      :autocomplete="autocomplete"
      :class="small ? ['form-control-sm'] : []"
    />
    <small class="text-danger">{{ error }}&nbsp;</small>
  </div>
</template>

<style scoped>
textarea {
  resize: none;
}
input:disabled,
textarea:disabled {
  background-color: #f5f5f5;
}
</style>
