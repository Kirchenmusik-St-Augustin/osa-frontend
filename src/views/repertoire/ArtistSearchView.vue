<script setup lang="ts">
import { useRouter } from 'vue-router'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'
import { useArtists } from '@/composables/useArtists'

const router = useRouter()
const { search } = useArtists()

function onSelect(id: number): void {
  void router.push({ name: 'repertoire-artists-show', params: { id } })
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Komponisten und Dirigenten</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-md-6">
      <SearchTypeahead :search="search" @select="onSelect" />
      <div class="text-center">
        <RouterLink class="btn btn-primary mt-4" :to="{ name: 'repertoire-artists-create' }">
          anlegen
        </RouterLink>
      </div>
    </div>
  </div>
</template>
