<script setup lang="ts">
// 1:1 port of Legacy's Content/Administrator/Users/Search.vue.
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'
import {
  useUserAdministration,
  type UserAdministrationDeletedEntry,
} from '@/composables/useUserAdministration'

const router = useRouter()
const { search, listDeleted } = useUserAdministration()

const deletedUsers = ref<UserAdministrationDeletedEntry[]>([])

onMounted(async () => {
  deletedUsers.value = await listDeleted()
})

function onSelect(id: number): void {
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
