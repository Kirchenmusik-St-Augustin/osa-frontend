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
// The topmost hit is always pre-highlighted (matches search-box UX
// conventions, e.g. a browser's own address bar) -- reset on every new
// result set so it never points at a hit that just scrolled away.
const highlightedIndex = ref(0)
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
      highlightedIndex.value = 0
    })
  }, 300)
}

function select(result: SearchResult): void {
  results.value = []
  query.value = ''
  emit('select', result.id)
}

function onKeydown(event: KeyboardEvent): void {
  if (!results.value.length) return
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, results.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      break
    case 'Enter': {
      event.preventDefault()
      const highlighted = results.value[highlightedIndex.value]
      if (highlighted) select(highlighted)
      break
    }
  }
}
</script>

<template>
  <div class="position-relative">
    <input
      v-model="query"
      class="form-control"
      type="text"
      placeholder="Suchen..."
      @input="onInput"
      @keydown="onKeydown"
    />
    <div
      v-if="results.length"
      class="list-group mt-1 position-absolute w-100 shadow-sm results-overlay"
    >
      <button
        v-for="(result, index) in results"
        :key="result.id"
        type="button"
        class="list-group-item list-group-item-action"
        :class="{ active: index === highlightedIndex }"
        @mouseenter="highlightedIndex = index"
        @click="select(result)"
      >
        {{ result.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Floats over the page content below instead of pushing it down --
   matches standard typeahead/autocomplete UX (Bootstrap's own
   .dropdown-menu uses the same position:absolute + z-index approach). */
.results-overlay {
  z-index: 1000;
  max-height: 20em;
  overflow-y: auto;
}
</style>
