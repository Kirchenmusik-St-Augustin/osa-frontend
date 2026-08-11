<script setup lang="ts">
import { useRouter } from 'vue-router'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'
import { useUsers } from '@/composables/useUsers'

const router = useRouter()
const { search } = useUsers()

function onSelect(id: number): void {
  void router.push({ name: 'system-users-show', params: { id } })
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Benutzerkonten verwalten</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-md-6">
      <SearchTypeahead :search="search" @select="onSelect" />
      <div class="text-center">
        <RouterLink class="btn btn-primary mt-4" :to="{ name: 'system-users-create' }">
          Benutzer-Konto erstellen
        </RouterLink>
      </div>
    </div>
  </div>
</template>
