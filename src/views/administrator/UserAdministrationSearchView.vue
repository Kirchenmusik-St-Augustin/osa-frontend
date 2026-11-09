<script setup lang="ts">
// Search for users including soft-deleted ones.
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'
import {
  useUserAdministration,
  type UserAdministrationDeletedEntry,
} from '@/composables/useUserAdministration'
import { extractApiErrors } from '@/services/apiErrors'
import { showToast } from '@/services/notifications'

const router = useRouter()
const { search, listDeleted } = useUserAdministration()

const deletedUsers = ref<UserAdministrationDeletedEntry[]>([])

onMounted(async () => {
  try {
    deletedUsers.value = await listDeleted()
  } catch (error) {
    showToast(
      extractApiErrors(error).generalError ?? 'Die Liste konnte nicht geladen werden.',
      true,
    )
  }
})

function onSelect(id: string): void {
  void router.push({ name: 'administrator-users-show', params: { id } })
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Benutzerkonten administrieren</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-md-6">
      <SearchTypeahead :search="search" @select="onSelect" />
    </div>
  </div>

  <div v-if="deletedUsers.length" class="row justify-content-center mt-4 text-center">
    <div class="h5 mb-3">Liste gelöschter Benutzerkonten</div>
    <div v-for="user in deletedUsers" :key="user.id" class="mb-2">
      <RouterLink
        class="text-decoration-none small text-muted"
        :to="{ name: 'administrator-users-show', params: { id: user.id } }"
      >
        {{ user.surname }}, {{ user.givenname }} ({{ user.email }})
      </RouterLink>
    </div>
  </div>
</template>
