<script setup lang="ts">
import AppModal from '@/components/common/AppModal.vue'
import type { PopularItem } from '@/composables/useBookings'
import { formatDateTime } from '@/services/dateFormat'

// Purely presentational -- the ⭐ "populäre Buchungen" dialog is a purely
// informative suggestion dialog, NOT a promote button: all its data already
// arrived with the initial Cast page load, no API call happens when this
// opens.
defineProps<{ popular: PopularItem }>()

const open = defineModel<boolean>({ required: true })
</script>

<template>
  <AppModal v-model="open">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title fs-6">Populäre Buchungen f. diese Komposition &amp; Position</h5>
        <button
          type="button"
          class="btn-close"
          aria-label="Schließen"
          @click="open = false"
        ></button>
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
  </AppModal>
</template>
