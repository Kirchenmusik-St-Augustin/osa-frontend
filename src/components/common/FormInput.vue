<script setup lang="ts">
// 1:1 port of Legacy's Components/Common/FormElements/FormInput.vue
// (label + input/textarea + reserved-space error line) -- a shared
// primitive used by every future admin form, not just Coreelement's.
// `number` type added for Schritt 4 (Artist birthyear/deathyear,
// Ordinariumwork/Propriumwork duration) -- Legacy's FormInput defaults
// `min` to 0 for every number input regardless of field semantics, kept
// here for the same 1:1 reason.
const model = defineModel<string | number | null>({ required: true })

withDefaults(
  defineProps<{
    id: string
    title: string
    type?: 'text' | 'textarea' | 'number'
    required?: boolean
    error?: string
    min?: number
    max?: number
  }>(),
  {
    type: 'text',
    required: false,
    error: '',
    min: 0,
    max: undefined,
  },
)
</script>

<template>
  <div class="form-group">
    <label class="form-label" :for="id"
      ><strong>{{ title }}</strong></label
    >
    <textarea
      v-if="type === 'textarea'"
      :id="id"
      v-model="model"
      class="form-control"
      rows="3"
      :required="required"
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
    />
    <input v-else :id="id" v-model="model" class="form-control" type="text" :required="required" />
    <small class="text-danger">{{ error }}&nbsp;</small>
  </div>
</template>

<style scoped>
textarea {
  resize: none;
}
</style>
