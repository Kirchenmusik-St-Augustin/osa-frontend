<script setup lang="ts">
// 1:1 port of Legacy's Scores/Search.vue.
import { useRouter } from 'vue-router'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'
import { useScores } from '@/composables/useScores'

const router = useRouter()
const { search } = useScores()

function onSelect(id: number): void {
  void router.push({ name: 'repertoire-scores-show', params: { id } })
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Noten-Archiv</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-md-6">
      <SearchTypeahead :search="search" @select="onSelect" />
      <div class="text-center">
        <RouterLink class="btn btn-primary mt-4" :to="{ name: 'repertoire-scores-create' }">
          anlegen
        </RouterLink>
      </div>
    </div>
  </div>
</template>
