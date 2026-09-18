<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { Modal } from 'bootstrap'
import type { PopularItem } from '@/composables/useBookings'
import { formatDateTime } from '@/services/dateFormat'

// Purely presentational -- the ⭐ "populäre Buchungen" dialog is a purely
// informative suggestion dialog, NOT a promote button: all its data already
// arrived with the initial Cast page load, no API call happens when this
// opens.
defineProps<{ modalId: string; popular: PopularItem }>()

const modalElement = useTemplateRef<HTMLDivElement>('modalElement')
let modalInstance: Modal | null = null

onMounted(() => {
  if (modalElement.value) {
    modalInstance = new Modal(modalElement.value, { backdrop: true, keyboard: true })
  }
})

onBeforeUnmount(() => {
  modalInstance?.dispose()
  modalInstance = null
})
</script>

<template>
  <div :id="`popular${modalId}`" ref="modalElement" class="modal fade" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title fs-6">Populäre Buchungen f. diese Komposition &amp; Position</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body row">
          <div class="col-sm-6">
            <strong>häufig gebucht</strong>
            <div v-for="item in popular.frequent" :key="item.id">
              {{ item.name }} ({{ item.total }})
            </div>
          </div>
          <div class="col-sm-6">
            <strong>kürzlich gebucht</strong>
            <div v-for="item in popular.recent" :key="item.id">
              {{ item.name }} ({{ formatDateTime(item.booked) }})
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
