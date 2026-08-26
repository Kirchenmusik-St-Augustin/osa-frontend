<script setup lang="ts">
// 1:1 port of Legacy's Content/Common/Selfadmin/Profile/Show.vue, plus a
// deployment-environment footer (no Legacy equivalent -- pure dev/ops aid,
// not a parity concern).
import { onMounted, ref } from 'vue'
import UserDataCard from '@/components/common/UserDataCard.vue'
import { useProfile } from '@/composables/useProfile'
import { useSystem } from '@/composables/useSystem'
import type { User } from '@/composables/useUsers'
import { confirmAction, showToast } from '@/services/notifications'
import { appEnvironment } from '@/runtimeConfig'

const { get, disconnectOauth2 } = useProfile()
const { getEnvironment } = useSystem()

const user = ref<User | null>(null)
const backendEnvironment = ref<string | null>(null)

onMounted(async () => {
  user.value = await get()
  try {
    backendEnvironment.value = (await getEnvironment()).environment
  } catch {
    // Unobtrusive footer info only -- omit silently rather than
    // interrupting the profile page over a failed background fetch.
  }
})

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

async function removeOauth2(bindingId: number): Promise<void> {
  const confirmed = await confirmAction('Soll diese Binding tatsächlich entfernt werden?')
  if (!confirmed) return

  try {
    await disconnectOauth2(bindingId)
    showToast('Bindung entfernt')
    if (user.value) {
      user.value = {
        ...user.value,
        oauth2_bindings: user.value.oauth2_bindings.filter((b) => b.id !== bindingId),
      }
    }
  } catch {
    showToast('Bindung konnte nicht entfernt werden.', true)
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Mein Benutzerkonto</h2>

  <div v-if="user" class="row justify-content-center mt-4">
    <div class="col-md-7">
      <UserDataCard :user="user" />

      <div v-if="user.oauth2_bindings.length" class="card my-4">
        <div class="card-header">
          <div class="h5">Verbundene Konten</div>
        </div>
        <div class="card-body">
          <div v-for="binding in user.oauth2_bindings" :key="binding.provider">
            <span class="me-2">{{ capitalize(binding.provider) }}</span>
            <i
              class="fas fa-trash-alt c-pointer"
              title="entfernen"
              @click="removeOauth2(binding.id)"
            ></i>
          </div>
        </div>
      </div>

      <div class="text-center">
        <RouterLink class="btn btn-primary my-3" :to="{ name: 'selfadmin-profile-edit' }">
          <span>Persönliche Daten bearbeiten</span>
        </RouterLink>
      </div>

      <p v-if="backendEnvironment" class="text-center small text-muted mt-4 mb-0">
        Backend: {{ backendEnvironment }}
      </p>
      <p v-if="appEnvironment()" class="text-center small text-muted mb-0">
        Frontend: {{ appEnvironment() }}
      </p>
    </div>
  </div>
</template>
