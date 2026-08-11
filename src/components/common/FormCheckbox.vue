<script setup lang="ts">
// 1:1 port of Legacy's Components/Common/FormElements/FormCheckbox.vue
// (Bootstrap checkbox/switch with a bold label).
const model = defineModel<boolean>({ required: true })

withDefaults(
  defineProps<{
    id: string
    title: string
    asSwitch?: boolean
  }>(),
  {
    asSwitch: false,
  },
)
</script>

<template>
  <div class="form-check" :class="{ 'form-switch': asSwitch }">
    <input
      :id="id"
      v-model="model"
      class="form-check-input"
      type="checkbox"
      :role="asSwitch ? 'switch' : 'checkbox'"
    />
    <label class="form-check-label" :for="id"
      ><strong>{{ title }}</strong></label
    >
  </div>
</template>
