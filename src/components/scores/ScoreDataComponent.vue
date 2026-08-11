<script setup lang="ts">
// 1:1 port of Legacy's Scores/ScoreDataComponent.vue.
import { formatUtcDateTime } from '@/services/dateFormat'

defineProps<{
  score?: { id: number; created_at: string | null; updated_at: string | null } | null
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
      <!-- 1:1 Legacy's own copy-paste: this row's label is "Erstelldatum"
           too, not "Aktualisiert am" -- a real Legacy typo, kept as-is. -->
      <small v-if="score.updated_at">
        Erstelldatum: {{ formatUtcDateTime(score.updated_at) }}
      </small>
    </div>
  </div>
</template>
