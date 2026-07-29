<script setup lang="ts">
import { ref } from 'vue'

// Replacement for Legacy's third-party `pure-vue3-type-ahead` widget (used
// on the Artists/Ordinariumworks/Propriumworks Search pages) -- same UX
// contract (type -> debounced remote search -> click a result to select),
// implemented directly instead of pulling in an unmaintained-looking niche
// dependency for a handful of call sites (CLAUDE.md "schlank"). Legacy's
// `force-item` behavior (free text alone never fires a selection) is
// preserved: `select()` only ever runs from a click on an actual result.
export interface SearchResult {
  id: number
  label: string
}

const props = defineProps<{
  search: (query: string) => Promise<SearchResult[]>
}>()

const emit = defineEmits<{ select: [id: number] }>()

const query = ref('')
const results = ref<SearchResult[]>([])
let debounceTimer: ReturnType<typeof setTimeout> | undefined

function onInput(): void {
  clearTimeout(debounceTimer)
  const currentQuery = query.value
  if (!currentQuery.trim()) {
    results.value = []
    return
  }
  debounceTimer = setTimeout(() => {
    void props.search(currentQuery).then((found) => {
      results.value = found
    })
  }, 300)
}

function select(result: SearchResult): void {
  results.value = []
  query.value = ''
  emit('select', result.id)
}
</script>

<template>
  <div>
    <input
      v-model="query"
      class="form-control"
      type="text"
      placeholder="Suchen..."
      @input="onInput"
    />
    <div v-if="results.length" class="list-group mt-1">
      <button
        v-for="result in results"
        :key="result.id"
        type="button"
        class="list-group-item list-group-item-action"
        @click="select(result)"
      >
        {{ result.label }}
      </button>
    </div>
  </div>
</template>
