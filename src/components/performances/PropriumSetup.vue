<script setup lang="ts">
import type { PerformancePropriumItem } from '@/composables/usePerformances'

// 1:1 port of Legacy's Components/Common/PropriumSetupComponent.vue --
// read-only display used on the calendar card, reused with-controls inside
// the Proprium editor modal (PerformanceFormView.vue).
withDefaults(
  defineProps<{
    proprium: PerformancePropriumItem[]
    withControls?: boolean
  }>(),
  { withControls: false },
)

const emit = defineEmits<{ removeElement: [item: PerformancePropriumItem] }>()
</script>

<template>
  <div v-for="item in proprium" :key="item.propriumelement_id" class="mb-2">
    <div>
      <small>
        <i
          v-if="withControls"
          class="c-pointer fas fa-trash me-1"
          title="entfernen"
          @click="emit('removeElement', item)"
        ></i>
        <strong>{{ item.propriumelement_name }}:</strong>
      </small>
    </div>
    <div>
      <small>{{ item.artist_name }}: {{ item.propriumwork_name }}</small>
    </div>
    <div v-if="item.description">
      <small class="text-black-50">{{ item.description }}</small>
    </div>
  </div>
</template>
