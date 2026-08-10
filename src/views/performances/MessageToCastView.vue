<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PerformanceCard from '@/components/performances/PerformanceCard.vue'
import EmailThresholdWarning from '@/components/common/EmailThresholdWarning.vue'
import {
  useBookings,
  type MessageRecipient,
  type PerformanceMessageToCast,
} from '@/composables/useBookings'
import { confirmAction, showToast } from '@/services/notifications'
import { parseWallClock } from '@/services/dateFormat'
import { useAuthStore } from '@/stores/auth'

// Port of Legacy's MessageToCast.vue + Common/ListUsergroupComponent.vue
// (incl. its SelectorComponent/ClipboardComponent) -- the ability dropdown
// ("alle" or one specific booked position), the "alle (N)" toggle-all
// switch, and the Nachname/Vorname/E-Mail/Telefon recipient table (mailto/
// tel links, disabled switch for recipients without an email) are all
// real, visible Legacy UI and are ported 1:1 here.
//
// Deliberate exception (User-confirmed 2026-07-31): Legacy's own "Nachricht
// verfassen" compose UI is a Bootstrap modal with NO trigger anywhere in
// its markup and posts to a GET-only route (guaranteed HTTP 405) -- it is
// genuinely dead, unreachable code that no real Legacy user has ever seen,
// so there is no observable pixel parity to preserve for it. Kept as a
// working INLINE textarea+Senden instead (see
// booking_service.send_message_to_cast, project_osa_migration_plan memory).
const props = defineProps<{ id: string }>()
const performanceId = computed(() => Number(props.id))

const { getMessageToCastPage, getMessageRecipients, sendMessageToCast } = useBookings()
const authStore = useAuthStore()

const performance = ref<PerformanceMessageToCast | null>(null)
const recipients = ref<MessageRecipient[]>([])
const selectedRecipientIds = ref<number[]>([])
const checkAllStatus = ref(false)
const selectedAbility = ref('all')
const message = ref('')
const sending = ref(false)

type PositionType = 'instruments' | 'voices' | 'choirjobs'
const POSITION_TYPES: readonly PositionType[] = ['instruments', 'voices', 'choirjobs']
const POSITION_LABELS: Record<PositionType, string> = {
  instruments: 'Instrumente',
  voices: 'Stimmen',
  choirjobs: 'Choraufgaben',
}

async function loadRecipients(): Promise<void> {
  selectedRecipientIds.value = []
  checkAllStatus.value = false
  if (selectedAbility.value === 'none') {
    recipients.value = []
    return
  }
  if (selectedAbility.value === 'all') {
    recipients.value = await getMessageRecipients(performanceId.value, null, null)
    return
  }
  const [type, idText] = selectedAbility.value.split('@') as [PositionType, string]
  recipients.value = await getMessageRecipients(performanceId.value, type, Number(idText))
}

onMounted(async () => {
  performance.value = await getMessageToCastPage(performanceId.value)
  await loadRecipients()
})

watch(selectedAbility, loadRecipients)

// Legacy's "zurück" goes to the calendar month of the performance's own
// schedule (PerformanceController::messageToCast() links to
// `route('...performances.index', { year, month })`), never to the
// performance's own show/detail page.
const backTarget = computed(() => {
  if (!performance.value) return { name: 'home' as const }
  const scheduleDate = parseWallClock(performance.value.schedule)
  return {
    name: 'home' as const,
    query: { year: scheduleDate.getFullYear(), month: scheduleDate.getMonth() + 1 },
  }
})

const hasBookings = computed(() => {
  if (!performance.value) return false
  const { instruments, voices, choirjobs } = performance.value.booked_cast
  return [...instruments, ...voices, ...choirjobs].some((item) => item.cast.length > 0)
})

const eligibleCount = computed(() => recipients.value.filter((r) => r.has_email).length)

// Schritt 7 Nachzug: 1:1 Legacy's `v-if="!$app.helper.emailsDisabled()"` --
// only the message-textarea+Senden block is swapped out, the recipient
// table/dropdown above stays visible regardless (see EmailThresholdWarning's
// own docstring for the source reference).
const emailKillSwitchActive = computed(() => authStore.user?.email_kill_switch.active ?? false)

function toggleCheckAll(): void {
  selectedRecipientIds.value = checkAllStatus.value
    ? recipients.value.filter((r) => r.has_email).map((r) => r.id)
    : []
}

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
  showToast('Mailing-Liste in Zwischenablage kopiert.')
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
        <RouterLink class="btn btn-primary mx-2" :to="backTarget"> zurück </RouterLink>
      </div>

      <div v-if="hasBookings">
        <div
          class="text-center mb-3 c-pointer"
          :class="{ invisible: !selectedRecipientIds.length }"
          @click="copyRecipients"
        >
          Mailing-Liste in Zwischenablage kopieren
        </div>

        <div class="row justify-content-center">
          <div class="col-md-8">
            <select id="message-to-cast-ability" v-model="selectedAbility" class="form-select">
              <option value="none">&nbsp;</option>
              <option value="all">alle</option>
              <optgroup v-for="type in POSITION_TYPES" :key="type" :label="POSITION_LABELS[type]">
                <option
                  v-for="item in performance.booked_cast[type]"
                  :key="`${type}-${item.id}`"
                  :value="`${type}@${item.id}`"
                >
                  {{ item.name }}
                </option>
              </optgroup>
            </select>
          </div>
        </div>

        <div v-if="recipients.length" class="mt-4">
          <div class="form-check form-switch mb-4">
            <input
              id="message-to-cast-check-all"
              v-model="checkAllStatus"
              class="form-check-input"
              type="checkbox"
              role="switch"
              @change="toggleCheckAll"
            />
            <label class="form-check-label" for="message-to-cast-check-all">
              <strong class="ps-3">alle ({{ eligibleCount }})</strong>
            </label>
          </div>

          <div class="table-responsive">
            <table class="table table-striped table-sm mx-auto w-100">
              <thead>
                <tr>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">Nachname</th>
                  <th scope="col">Vorname</th>
                  <th scope="col">E-Mail</th>
                  <th scope="col">Telefon</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="recipient in recipients" :key="recipient.id">
                  <td>
                    <div class="form-check form-switch">
                      <input
                        v-if="recipient.has_email"
                        class="form-check-input"
                        type="checkbox"
                        role="switch"
                        :checked="selectedRecipientIds.includes(recipient.id)"
                        @change="toggleRecipient(recipient.id)"
                      />
                      <input
                        v-else
                        class="form-check-input"
                        type="checkbox"
                        role="switch"
                        disabled
                      />
                    </div>
                  </td>
                  <td>{{ recipient.surname }}</td>
                  <td>{{ recipient.givenname }}</td>
                  <td>
                    <a
                      v-if="recipient.email"
                      class="text-decoration-none"
                      :href="`mailto:${recipient.email}`"
                      >{{ recipient.email }}</a
                    >
                  </td>
                  <td>
                    <a
                      v-if="recipient.phone"
                      class="text-decoration-none"
                      :href="`tel:${recipient.phone}`"
                      >{{ recipient.phone }}</a
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          class="text-center my-3 c-pointer"
          :class="{ invisible: !selectedRecipientIds.length }"
          @click="copyRecipients"
        >
          Mailing-Liste in Zwischenablage kopieren
        </div>

        <template v-if="!emailKillSwitchActive">
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
        </template>
        <EmailThresholdWarning v-else variant="card" />
      </div>
      <p v-else class="text-center">Zu dieser Aufführung gibt es aktuell keine Buchungen.</p>

      <div class="text-center my-4">
        <RouterLink class="btn btn-primary mx-2" :to="backTarget"> zurück </RouterLink>
      </div>
    </div>
  </div>
</template>
