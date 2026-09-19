<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { TOAST_DURATION_MS, useNotificationStore } from '@/stores/notifications'

// Renders the store's toasts in the bottom-left corner, using Bootstrap's own
// .toast styling. An error toast is announced assertively (role="alert"), a
// success toast politely (role="status").
const notificationStore = useNotificationStore()
const { toasts } = storeToRefs(notificationStore)

const presentedToasts = computed(() =>
  toasts.value.map((toast) => ({
    id: toast.id,
    message: toast.message,
    role: toast.isError ? 'alert' : 'status',
    colorClass: toast.isError ? 'text-bg-danger' : 'text-bg-success',
    iconClass: toast.isError ? 'fa-exclamation-circle' : 'fa-check-circle',
  })),
)

const progressStyle = { '--toast-duration': `${TOAST_DURATION_MS}ms` }

// Same fade as AppModal.vue: Bootstrap's .fade (0.15s opacity, honors
// prefers-reduced-motion) with the hidden start/end state expressed through
// the !important `opacity-0` utility, since .show stays on every toast.
const fade = {
  enterActiveClass: 'fade',
  leaveActiveClass: 'fade',
  enterFromClass: 'opacity-0',
  leaveToClass: 'opacity-0',
}
</script>

<template>
  <div class="toast-container position-fixed bottom-0 start-0 p-3">
    <TransitionGroup v-bind="fade">
      <div
        v-for="toast in presentedToasts"
        :key="toast.id"
        class="toast show border-0 overflow-hidden"
        :class="toast.colorClass"
        :role="toast.role"
      >
        <div class="d-flex">
          <div class="toast-body">
            <i class="fas me-2" :class="toast.iconClass"></i>{{ toast.message }}
          </div>
          <button
            type="button"
            class="btn-close btn-close-white m-auto me-2"
            aria-label="Schließen"
            @click="notificationStore.dismissToast(toast.id)"
          ></button>
        </div>
        <div class="toast-progress" :style="progressStyle"></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-progress {
  height: 4px;
  background-color: rgba(255, 255, 255, 0.7);
  transform-origin: left;
  animation: toast-progress var(--toast-duration) linear forwards;
}

@keyframes toast-progress {
  to {
    transform: scaleX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast-progress {
    display: none;
  }
}
</style>
