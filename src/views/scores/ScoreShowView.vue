<script setup lang="ts">
// 1:1 port of Legacy's Scores/Show.vue.
import { onMounted, reactive, ref } from 'vue'
import ScoreDataComponent from '@/components/scores/ScoreDataComponent.vue'
import ScoreFieldsComponent from '@/components/scores/ScoreFieldsComponent.vue'
import {
  useScores,
  type Score,
  type ScoreFieldConfig,
  type ScoreFieldsPayload,
} from '@/composables/useScores'

const props = defineProps<{ id: string }>()
const { get, getFieldsConfig } = useScores()

const score = ref<Score | null>(null)
const fields = reactive<ScoreFieldsPayload>({})
const fieldsConfig = ref<Record<string, ScoreFieldConfig>>({})

onMounted(async () => {
  const [scoreData, config] = await Promise.all([get(Number(props.id)), getFieldsConfig()])
  score.value = scoreData
  Object.assign(fields, scoreData.fields)
  fieldsConfig.value = config
})
</script>

<template>
  <h2 class="h2 text-center mb-4">Noten-Archiv</h2>

  <div class="text-center my-4">
    <div class="my-3">
      <RouterLink class="btn btn-primary" :to="{ name: 'repertoire-scores-edit', params: { id } }">
        bearbeiten
      </RouterLink>
    </div>
    <div class="my-3">
      <RouterLink class="btn btn-primary" :to="{ name: 'repertoire-scores-search' }">
        Zur Suche
      </RouterLink>
    </div>
  </div>
  <div v-if="score" class="card text-left mb-5">
    <div class="card-body">
      <ScoreDataComponent :score="score" />
      <ScoreFieldsComponent v-model="fields" :fields-config="fieldsConfig" readonly />
    </div>
  </div>
</template>
