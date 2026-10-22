<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { useClickOutside } from '@/composables/useClickOutside'

// Typeahead widget (used on the Artists/Ordinariumworks/Propriumworks Search
// pages): type -> debounced remote search -> click a result to select.
// Implemented directly instead of pulling in a niche dependency for a
// handful of call sites. Free text alone never fires a selection:
// `select()` only ever runs from a click on an actual result.
export interface SearchResult {
  id: string
  label: string
}

// Longest search term the API accepts; a longer one is answered with a 422
// and the typeahead would silently keep showing the old results.
const MAX_QUERY_LENGTH = 64

const props = defineProps<{
  search: (query: string) => Promise<SearchResult[]>
}>()

const emit = defineEmits<{ select: [id: string] }>()

const query = ref('')
const results = ref<SearchResult[]>([])
// The topmost hit is always pre-highlighted (matches search-box UX
// conventions, e.g. a browser's own address bar) -- reset on every new
// result set so it never points at a hit that just scrolled away.
const highlightedIndex = ref(0)
let debounceTimer: ReturnType<typeof setTimeout> | undefined
// Incremented on every keystroke (and on unmount): a response only counts if
// no newer input happened since its request started, so a slow answer to an
// old query can never overwrite the results of the current one.
let latestSearchId = 0

function onInput(): void {
  clearTimeout(debounceTimer)
  latestSearchId += 1
  const searchId = latestSearchId
  const currentQuery = query.value
  if (!currentQuery.trim()) {
    results.value = []
    return
  }
  debounceTimer = setTimeout(() => {
    void props.search(currentQuery).then((found) => {
      if (searchId !== latestSearchId) return
      results.value = found
      highlightedIndex.value = 0
    })
  }, 300)
}

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
  latestSearchId += 1
})

// A result list nobody picks from must not keep covering the page: Escape
// and a click anywhere outside the widget dismiss it, and an answer that is
// still on its way must not bring it back.
function dismiss(): void {
  clearTimeout(debounceTimer)
  latestSearchId += 1
  results.value = []
}

const rootElement = useTemplateRef<HTMLElement>('rootElement')
useClickOutside(rootElement, dismiss)

function select(result: SearchResult): void {
  latestSearchId += 1
  results.value = []
  query.value = ''
  emit('select', result.id)
}

function onKeydown(event: KeyboardEvent): void {
  if (!results.value.length) return
  switch (event.key) {
    // Only closes the list: an enclosing dialog must not close with the same key press.
    case 'Escape':
      event.stopPropagation()
      dismiss()
      break
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
  <div ref="rootElement" class="position-relative">
    <input
      v-model="query"
      class="form-control"
      type="text"
      placeholder="Suchen..."
      aria-label="Suchen"
      :maxlength="MAX_QUERY_LENGTH"
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
