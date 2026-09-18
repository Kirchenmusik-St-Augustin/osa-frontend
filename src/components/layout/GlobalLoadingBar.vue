<script setup lang="ts">
// Custom animated bar (adapted from PrimeVue's <ProgressBar> concept -- this
// app has no PrimeVue dependency). Bootstrap's own .progress-bar-striped (a
// single-hue bar with a semi-transparent white overlay) reads as too
// low-contrast in practice, so this uses a two-color stripe pattern with
// $primary (the navbar's own background color) and $warning (matching the
// navbar's music-note icon).
import { useLoadingStore } from '@/stores/loading'

const loadingStore = useLoadingStore()
</script>

<template>
  <div v-if="loadingStore.isLoading" class="global-loading-bar" role="progressbar"></div>
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
  /* --bs-primary/--bs-warning reference the same CSS variables Bootstrap's
     bg-primary/bg-warning utility classes resolve to, so this stays in
     sync with the theme automatically instead of hardcoding hex values. */
  background-image: linear-gradient(
    45deg,
    var(--bs-primary) 25%,
    var(--bs-warning) 25%,
    var(--bs-warning) 50%,
    var(--bs-primary) 50%,
    var(--bs-primary) 75%,
    var(--bs-warning) 75%
  );
  background-size: 20px 20px;
  animation: global-loading-bar-stripes 1s linear infinite;
}

@keyframes global-loading-bar-stripes {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 20px 0;
  }
}
</style>
