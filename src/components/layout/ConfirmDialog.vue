<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppModal from '@/components/common/AppModal.vue'
import { useNotificationStore } from '@/stores/notifications'

// The yes/no dialog behind confirmAction(): open while the store holds an
// unanswered question. Escape or a click on the backdrop close AppModal by
// writing `false` to `isOpen`, which is answered as "no". Focus starts on the
// dialog itself, not on a button, so a still-held Enter cannot confirm it.
const notificationStore = useNotificationStore()
const { confirmationMessage } = storeToRefs(notificationStore)

const isOpen = computed({
  get: () => confirmationMessage.value !== null,
  set: (open: boolean) => {
    if (open) return
    notificationStore.answerConfirmation(false)
  },
})

// The store clears its message the moment the question is answered; keep
// showing it until the dialog has finished fading out.
const displayedMessage = ref('')
watch(
  confirmationMessage,
  (message) => {
    if (message === null) return
    displayedMessage.value = message
  },
  { immediate: true },
)
</script>

<template>
  <AppModal v-model="isOpen">
    <div class="modal-content">
      <div class="modal-body">{{ displayedMessage }}</div>
      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-secondary"
          @click="notificationStore.answerConfirmation(false)"
        >
          Nein
        </button>
        <button
          type="button"
          class="btn btn-danger"
          @click="notificationStore.answerConfirmation(true)"
        >
          Ja
        </button>
      </div>
    </div>
  </AppModal>
</template>
