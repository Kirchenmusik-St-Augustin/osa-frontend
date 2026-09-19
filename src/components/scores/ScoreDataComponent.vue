<script setup lang="ts">
import { formatUtcDateTime } from '@/services/dateFormat'

defineProps<{
  score?: { id: string; created_at: string | null; updated_at: string | null } | null
}>()
</script>

<template>
  <div v-if="score" class="text-black-50 mb-3">
    <div>
      <small v-if="score.id">Eintrags-ID: {{ score.id }}</small>
    </div>
    <div>
      <small v-if="score.created_at">
        Erstelldatum: {{ formatUtcDateTime(score.created_at) }}
      </small>
    </div>
    <div>
      <small v-if="score.updated_at">
        Änderungsdatum: {{ formatUtcDateTime(score.updated_at) }}
      </small>
    </div>
  </div>
</template>
