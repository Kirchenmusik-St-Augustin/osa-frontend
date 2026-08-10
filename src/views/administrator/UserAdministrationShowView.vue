<script setup lang="ts">
// 1:1 port of Legacy's Content/Administrator/Users/Show.vue.
import { onMounted, ref } from 'vue'
import {
  useUserAdministration,
  type UserAdministrationDetail,
} from '@/composables/useUserAdministration'
import { formatUtcDateTime } from '@/services/dateFormat'
import { confirmAction, showToast } from '@/services/notifications'

const props = defineProps<{ id: string }>()
const { get, restore, unlock, setPassword } = useUserAdministration()

const user = ref<UserAdministrationDetail | null>(null)
// Shown only once, right after setPassword -- never re-fetched from the
// backend (1:1 Legacy: `newpw` lives only in that one action response,
// GET/Show never returns it).
const newPassword = ref<string | null>(null)

onMounted(async () => {
  const result = await get(Number(props.id))
  user.value = result.user
})

type ActionName = 'restore' | 'unlock' | 'setPassword'
const ACTION_LABELS: Record<ActionName, string> = {
  restore: 'wiederherstellen',
  unlock: 'entsperren',
  setPassword: 'setze ein generiertes Passwort',
}
const ACTIONS: Record<ActionName, (id: number) => ReturnType<typeof restore>> = {
  restore,
  unlock,
  setPassword,
}

async function doAction(action: ActionName): Promise<void> {
  const confirmed = await confirmAction(`${ACTION_LABELS[action]} wirklich durchführen?`)
  if (!confirmed) return

  newPassword.value = null
  try {
    const result = await ACTIONS[action](Number(props.id))
    user.value = result.user
    showToast('Aktion durchgeführt')
    if (result.newpw) newPassword.value = result.newpw
  } catch {
    showToast(`Bei Durchführung von "${ACTION_LABELS[action]}" ist ein Fehler aufgetreten.`, true)
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Benutzerkonten administrieren</h2>

  <div v-if="user">
    <p class="h4 text-center mb-1">{{ user.surname }}, {{ user.givenname }}</p>
    <p class="h4 text-center mb-4">{{ user.email }}</p>

    <div class="row justify-content-center my-4">
      <div class="col-md-6 text-center">
        <div class="mb-2">
          <span class="me-2">Benutzerkonto gelöscht:</span>
          <span :class="user.deleted_at ? 'text-danger' : 'text-success'">
            {{ user.deleted_at ? formatUtcDateTime(user.deleted_at) : 'nein' }}
          </span>
        </div>
        <div v-if="user.deleted_at">
          <button type="button" class="btn btn-danger mt-3" @click="doAction('restore')">
            wiederherstellen
          </button>
        </div>
        <div v-else>
          <div class="mb-2">
            <span class="me-2">Benutzer gesperrt:</span>
            <span :class="user.auth_locked ? 'text-danger' : 'text-success'">
              {{ user.auth_locked ? 'ja' : 'nein' }}
            </span>
          </div>
          <div class="mb-2">
            <span class="me-2">E-Mail-Bestätigung ausständig:</span>
            <span :class="user.email_verified_at ? 'text-success' : 'text-danger'">
              {{ user.email_verified_at ? 'nein' : 'ja' }}
            </span>
          </div>
        </div>
      </div>
      <div v-if="!user.deleted_at" class="text-center mt-4">
        <button
          v-if="user.auth_locked"
          type="button"
          class="btn btn-danger"
          @click="doAction('unlock')"
        >
          entsperren
        </button>
        <button v-else type="button" class="btn btn-danger" @click="doAction('setPassword')">
          setze ein generiertes Passwort
        </button>
      </div>
      <div class="text-center mt-4">
        <RouterLink :to="{ name: 'administrator-users-search' }">
          <button type="button" class="btn btn-primary">Zurück zur Suche</button>
        </RouterLink>
      </div>
      <div v-if="newPassword" class="mt-3 mb-5 py-5 text-center">
        <h3>Neues Passwort</h3>
        <small class="text-danger">(wird nur einmal angezeigt!)</small>
        <div class="my-4 text-danger">
          <span class="border p-2">{{ newPassword }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
