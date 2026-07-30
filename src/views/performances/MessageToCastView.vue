<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PerformanceCard from '@/components/performances/PerformanceCard.vue'
import {
  useBookings,
  type MessageRecipient,
  type PerformanceMessageToCast,
} from '@/composables/useBookings'
import { confirmAction, showToast } from '@/services/notifications'

// Port of Legacy's MessageToCast.vue -- the Schritt-6 bugfix target. Legacy's
// own "Nachricht senden" button posted to a GET-only route (guaranteed HTTP
// 405, the feature was never reachable); this builds a real, working send
// (see booking_service.send_message_to_cast, project_osa_migration_plan
// memory).
const props = defineProps<{ id: string }>()
const performanceId = computed(() => Number(props.id))

const { getMessageToCastPage, getMessageRecipients, sendMessageToCast } = useBookings()

const performance = ref<PerformanceMessageToCast | null>(null)
const recipients = ref<MessageRecipient[]>([])
const selectedRecipientIds = ref<number[]>([])
const message = ref('')
const sending = ref(false)

onMounted(async () => {
  performance.value = await getMessageToCastPage(performanceId.value)
  recipients.value = await getMessageRecipients(performanceId.value, null, null)
})

const hasBookings = computed(() => {
  if (!performance.value) return false
  const { instruments, voices, choirjobs } = performance.value.booked_cast
  return [...instruments, ...voices, ...choirjobs].some((item) => item.cast.length > 0)
})

function toggleRecipient(id: number): void {
  selectedRecipientIds.value = selectedRecipientIds.value.includes(id)
    ? selectedRecipientIds.value.filter((candidateId) => candidateId !== id)
    : [...selectedRecipientIds.value, id]
}

function copyRecipients(): void {
  const emails = recipients.value
    .filter((recipient) => selectedRecipientIds.value.includes(recipient.id) && recipient.email)
    .map((recipient) => recipient.email)
    .join(', ')
  void navigator.clipboard.writeText(emails)
  showToast('Empfänger-Liste kopiert.')
}

async function send(): Promise<void> {
  const confirmed = await confirmAction('Nachricht absenden?')
  if (!confirmed) return

  sending.value = true
  try {
    await sendMessageToCast(performanceId.value, selectedRecipientIds.value, message.value)
    showToast('Nachricht versandt.')
    message.value = ''
    selectedRecipientIds.value = []
  } catch {
    showToast('Nachricht konnte nicht versandt werden.', true)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Nachricht an aktuelle Besetzung</h2>

  <div v-if="performance" class="row justify-content-center mt-4">
    <div class="col-md-9 justify-content-center">
      <PerformanceCard
        :performance="{
          id: performance.id,
          schedule: performance.schedule,
          location: performance.location,
          ordinariumwork_name: performance.ordinariumwork_name,
          ordinariumwork_artist_name: performance.ordinariumwork_artist_name,
          ordinariumwork_demanding: false,
          artist_name: performance.artist_name,
          proprium: performance.proprium,
          demanding_proprium: performance.demanding_proprium,
          rehearsals: performance.rehearsals,
        }"
      />

      <div class="text-center my-4">
        <RouterLink
          class="btn btn-primary mx-2"
          :to="{ name: 'performances-show', params: { id: performance.id } }"
        >
          zurück
        </RouterLink>
      </div>

      <div v-if="hasBookings">
        <div class="text-center mb-2">
          <button type="button" class="btn btn-secondary btn-sm" @click="copyRecipients">
            Empfänger kopieren
          </button>
        </div>
        <div class="row">
          <div v-for="recipient in recipients" :key="recipient.id" class="col-sm-6 form-check">
            <input
              :id="`recipient-${recipient.id}`"
              class="form-check-input"
              type="checkbox"
              :checked="selectedRecipientIds.includes(recipient.id)"
              @change="toggleRecipient(recipient.id)"
            />
            <label class="form-check-label" :for="`recipient-${recipient.id}`">
              {{ recipient.surname }}, {{ recipient.givenname }}
              <span v-if="!recipient.has_email" class="text-black-50">(keine E-Mail)</span>
            </label>
          </div>
        </div>

        <textarea
          v-model="message"
          class="form-control mt-3"
          rows="5"
          placeholder="Nachricht"
        ></textarea>
        <div class="text-center mt-2">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!message || !selectedRecipientIds.length || sending"
            @click="send"
          >
            Senden
          </button>
        </div>
      </div>
      <p v-else class="text-center">Zu dieser Aufführung gibt es aktuell keine Buchungen.</p>
    </div>
  </div>
</template>
