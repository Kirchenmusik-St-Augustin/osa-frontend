<script setup lang="ts">
import { useRouter } from 'vue-router'
import SearchTypeahead from '@/components/common/SearchTypeahead.vue'
import { usePropriumworks } from '@/composables/usePropriumworks'

const router = useRouter()
const { search } = usePropriumworks()

function onSelect(id: number): void {
  void router.push({ name: 'repertoire-propriumworks-show', params: { id } })
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Proprium-Kompositionen</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-md-6">
      <SearchTypeahead :search="search" @select="onSelect" />
      <div class="text-center">
        <RouterLink class="btn btn-primary mt-4" :to="{ name: 'repertoire-propriumworks-create' }">
          Proprium-Komposition erstellen
        </RouterLink>
      </div>
    </div>
  </div>
</template>
