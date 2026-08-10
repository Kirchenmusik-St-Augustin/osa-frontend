<script setup lang="ts">
import { ref } from 'vue'

// 1:1 port of Legacy's Components/Common/TogglerComponent.vue -- a shared
// collapse-toggle primitive, not Performance-specific (also used on the
// RequestLog day-grouping, see RequestLogUserView.vue), so it lives in
// components/common/ like FormInput/FormSelect.
const props = withDefaults(
  defineProps<{
    title: string
    initShow?: boolean
    hideDesc?: boolean
    hideBorder?: boolean
  }>(),
  {
    initShow: false,
    hideDesc: false,
    hideBorder: false,
  },
)

const show = ref(props.initShow)
</script>

<template>
  <div>
    <div class="c-pointer text-primary my-3" @click="show = !show">
      <i :class="show ? 'fas fa-minus-square' : 'fas fa-plus-square'"></i>
      <strong class="ms-2">{{ title }}</strong>
      <strong v-if="!hideDesc">&nbsp;{{ show ? 'verbergen' : 'anzeigen' }}</strong>
    </div>
    <div v-if="show" :class="hideBorder ? '' : 'border rounded p-2 my-1'">
      <slot />
    </div>
  </div>
</template>
