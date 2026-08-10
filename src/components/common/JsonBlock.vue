<script setup lang="ts">
import { computed } from 'vue'

// Lean custom alternative to Legacy's `vue-json-viewer` package: no
// collapsible tree, but no new npm dependency for a single page either
// (AHA principle). Content-complete -- indented JSON.stringify text.
const props = defineProps<{ value: unknown }>()

const formatted = computed(() => JSON.stringify(props.value, null, 2))
</script>

<template>
  <pre class="json-block">{{ formatted }}</pre>
</template>

<style scoped>
.json-block {
  background-color: var(--bs-secondary-bg, #e9ecef);
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 0.375rem;
  padding: 0.75rem;
  max-height: 20em;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
