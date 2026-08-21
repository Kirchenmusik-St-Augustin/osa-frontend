<script setup lang="ts">
// No Legacy equivalent -- ported from the vb-fastapi-vue sister project's
// global loading bar, adapted from PrimeVue's <ProgressBar> to Bootstrap's
// own striped/animated progress bar (osa-frontend has no PrimeVue
// dependency, and Bootstrap already ships the exact animation needed).
import { useLoadingStore } from '@/stores/loading'

const loadingStore = useLoadingStore()
</script>

<template>
  <div v-if="loadingStore.isLoading" class="global-loading-bar progress" role="progressbar">
    <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary w-100"></div>
  </div>
</template>

<style scoped>
/* Above the sticky-top navbar (Bootstrap's $zindex-sticky: 1020) and any
   fixed element (1030), below Bootstrap's own offcanvas-backdrop/modal
   levels (1040+) -- see bootstrap/scss/_variables.scss. SweetAlert2
   toasts/dialogs sit at 1060, so they always stay above this bar. */
.global-loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 1035;
  border-radius: 0;
}
</style>
