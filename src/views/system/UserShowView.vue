<script setup lang="ts">
// 1:1 port of Legacy's Content/System/Users/Show.vue -- the "Benutzer-Daten"/
// "Eigenschaften" cards themselves live in UserDataCard.vue (shared with
// ProfileShowView.vue, see that component's docstring).
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UserDataCard from '@/components/common/UserDataCard.vue'
import { useUsers, type User } from '@/composables/useUsers'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { get, remove } = useUsers()

const user = ref<User | null>(null)

const subtitle = computed(() =>
  user.value ? `${user.value.surname}, ${user.value.givenname}` : '',
)

onMounted(async () => {
  user.value = await get(Number(props.id))
})

async function destroy(): Promise<void> {
  const confirmed = await confirmAction('Wirklich löschen?')
  if (!confirmed) return

  try {
    await remove(Number(props.id))
    showToast('gelöscht.')
    await router.push({ name: 'system-users-search' })
  } catch (error) {
    const { fieldErrors } = extractApiErrors(error)
    showToast(
      fieldErrors['general'] ?? 'Benutzerkonto kann nicht gelöscht werden, da noch in Verwendung.',
      true,
    )
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Benutzerkonto verwalten</h2>
  <p class="h4 text-center mb-4">{{ subtitle }}</p>

  <div v-if="user" class="row justify-content-center mt-4">
    <div class="col-md-7">
      <UserDataCard :user="user" />

      <div class="text-center my-3">
        <div class="mb-4">
          <RouterLink
            class="text-decoration-none text-secondary"
            :to="{ name: 'system-users-requests-and-bookings', params: { id } }"
          >
            Anfragen und Buchungen für dieses Konto einsehen
          </RouterLink>
        </div>
        <RouterLink class="btn btn-primary" :to="{ name: 'system-users-edit', params: { id } }">
          bearbeiten
        </RouterLink>
        <button v-if="user.deletable" type="button" class="btn btn-danger ms-3" @click="destroy">
          löschen
        </button>
        <span v-else title="Konto hat Sonderrechte oder noch künftige Buchungen.">
          <button type="button" class="btn btn-danger ms-3" disabled>löschen</button>
        </span>
        <div class="mt-3">
          <RouterLink class="btn btn-secondary mb-3" :to="{ name: 'system-users-search' }">
            zurück
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
