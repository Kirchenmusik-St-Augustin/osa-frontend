<script setup lang="ts">
// 1:1 port of Legacy's Content/Common/Selfadmin/Support/MessageToContactperson.vue --
// native <select><optgroup> per role (FormSelect.vue can't render optgroups),
// disabled <option> for contacts without a verified email, a role-description
// card per role fed straight from the DB (role.description, not hardcoded).
import { computed, onMounted, ref } from 'vue'
import { useSupport, type RoleWithContacts } from '@/composables/useSupport'
import { useAuthStore } from '@/stores/auth'
import { confirmAction, showToast } from '@/services/notifications'
import FormInput from '@/components/common/FormInput.vue'
import EmailThresholdWarning from '@/components/common/EmailThresholdWarning.vue'

const { getContactpersons, sendMessageToContactperson } = useSupport()
const authStore = useAuthStore()

const roles = ref<RoleWithContacts[]>([])
const selectedRecipientId = ref<number | null>(null)
const message = ref('')
const sending = ref(false)

onMounted(async () => {
  roles.value = await getContactpersons()
})

const emailKillSwitchActive = computed(() => authStore.user?.email_kill_switch.active ?? false)

const canSend = computed(
  () => message.value.length >= 3 && selectedRecipientId.value !== null && !sending.value,
)

async function send(): Promise<void> {
  const confirmed = await confirmAction('Nachricht absenden?')
  if (!confirmed || selectedRecipientId.value === null) return

  sending.value = true
  try {
    await sendMessageToContactperson(selectedRecipientId.value, message.value)
    showToast('Nachricht versandt.')
  } catch {
    // 1:1 Legacy's exact (typo'd) wording -- a real, reachable page, unlike
    // MessageToCastView's dead-route error text.
    showToast('Nachricht konnte nicht versanct werden.', true)
  } finally {
    message.value = ''
    sending.value = false
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Meine Ansprechpersonen</h2>

  <div v-if="roles.length" class="row justify-content-center mt-4">
    <div class="col-md-7">
      <div class="my-2">
        Diese Web-Anwendung weist bestimmten Personen rollenbasierend spezielle Rechte zu.
      </div>
      <div class="my-2">
        Mit diesem Formular kann einer dieser Ansprechpersonen eine Nachricht geschickt werden.
      </div>
      <br />

      <form class="text-start mb-4" @submit.prevent>
        <select
          id="message-to-contactperson-recipient"
          v-model.number="selectedRecipientId"
          class="form-select mb-2"
        >
          <optgroup v-for="role in roles" :key="role.name" :label="role.label">
            <option
              v-for="contact in role.users"
              :key="`${role.name}-${contact.id}`"
              :value="contact.id"
              :disabled="!contact.has_email"
            >
              {{ contact.surname }}, {{ contact.givenname
              }}{{ contact.has_email ? '' : ' (keine E-Mail-Adresse bekannt)' }}
            </option>
          </optgroup>
        </select>
      </form>

      <div v-if="!emailKillSwitchActive">
        <FormInput
          id="message-to-contactperson-message"
          v-model="message"
          title="Nachrichtentext"
          type="textarea"
        />
        <div class="text-center my-3">
          <button type="button" class="btn btn-primary" :disabled="!canSend" @click="send">
            senden
          </button>
        </div>
      </div>
      <EmailThresholdWarning v-else variant="card" />

      <div class="text-center mt-5 h4">Rollenbeschreibungen</div>
      <div v-for="role in roles" :key="role.id" class="my-3">
        <div class="card">
          <div class="card-header">
            <span class="me-2">Rolle: {{ role.label }}</span>
          </div>
          <div class="card-body">
            <div class="role-description">{{ role.description ?? '' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.role-description {
  width: 100%;
  min-width: 100%;
  text-align: justify;
  white-space: pre-wrap;
}
</style>
