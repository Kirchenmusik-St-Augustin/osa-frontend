<script setup lang="ts">
// 1:1 port of Legacy's Components/Common/FormElements/FormInput.vue
// (label + input/textarea + reserved-space error line) -- a shared
// primitive used by every future admin form, not just Coreelement's.
const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    id: string
    title: string
    type?: 'text' | 'textarea'
    required?: boolean
    error?: string
  }>(),
  {
    type: 'text',
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
    <textarea
      v-if="type === 'textarea'"
      :id="id"
      v-model="model"
      class="form-control"
      rows="3"
      :required="required"
    ></textarea>
    <input v-else :id="id" v-model="model" class="form-control" type="text" :required="required" />
    <small class="text-danger">{{ error }}&nbsp;</small>
  </div>
</template>

<style scoped>
textarea {
  resize: none;
}
</style>
