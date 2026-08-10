<script setup lang="ts">
// 1:1 port of Legacy's Content/Common/Selfadmin/Profile/Show.vue.
import { onMounted, ref } from 'vue'
import UserDataCard from '@/components/common/UserDataCard.vue'
import { useProfile } from '@/composables/useProfile'
import type { User } from '@/composables/useUsers'
import { confirmAction, showToast } from '@/services/notifications'

const { get, disconnectOauth2 } = useProfile()

const user = ref<User | null>(null)

onMounted(async () => {
  user.value = await get()
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
          Persönliche Daten bearbeiten
        </RouterLink>
      </div>
    </div>
  </div>
</template>
