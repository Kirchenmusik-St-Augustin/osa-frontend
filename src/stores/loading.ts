import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// Backs the global loading bar (components/layout/GlobalLoadingBar.vue),
// driven by services/api.ts's request/response interceptors. Counter-based
// (not a plain boolean) so overlapping in-flight requests don't make the
// bar disappear before the slowest one actually finishes -- 1:1 the
// vb-fastapi-vue sister project's stores/loading.ts.
export const useLoadingStore = defineStore('loading', () => {
  const activeRequests = ref(0)

  const isLoading = computed(() => activeRequests.value > 0)

  function startLoading(): void {
    activeRequests.value++
  }

  function stopLoading(): void {
    if (activeRequests.value > 0) {
      activeRequests.value--
    }
  }

  return { activeRequests, isLoading, startLoading, stopLoading }
})
