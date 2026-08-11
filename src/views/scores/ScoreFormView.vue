<script setup lang="ts">
// 1:1 port of Legacy's Scores/Form.vue -- serves both "anlegen" (no `id`
// prop) and "bearbeiten" (`id` set), exactly like Legacy's single
// Form.vue backing both the create() and edit() controller actions.
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScoreDataComponent from '@/components/scores/ScoreDataComponent.vue'
import ScoreFieldsComponent from '@/components/scores/ScoreFieldsComponent.vue'
import {
  useScores,
  type Score,
  type ScoreFieldConfig,
  type ScoreFieldsPayload,
} from '@/composables/useScores'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const { getFieldsConfig, getDefaults, get, create, update } = useScores()

const score = ref<Score | null>(null)
const fields = reactive<ScoreFieldsPayload>({})
const fieldsConfig = ref<Record<string, ScoreFieldConfig>>({})
const fieldErrors = ref<Record<string, string>>({})
const submitting = ref(false)
const ready = ref(false)

async function loadInitialFields(): Promise<ScoreFieldsPayload> {
  if (!props.id) return getDefaults()
  score.value = await get(Number(props.id))
  return score.value.fields
}

onMounted(async () => {
  const [config, initialFields] = await Promise.all([getFieldsConfig(), loadInitialFields()])
  fieldsConfig.value = config
  Object.assign(fields, initialFields)
  ready.value = true
})

async function save(): Promise<void> {
  const confirmed = await confirmAction('Wirklich speichern?')
  if (!confirmed) return

  submitting.value = true
  fieldErrors.value = {}
  try {
    const saved = props.id ? await update(Number(props.id), fields) : await create(fields)
    showToast('gespeichert.')
    await router.push({ name: 'repertoire-scores-show', params: { id: saved.id } })
  } catch (error) {
    fieldErrors.value = extractApiErrors(error).fieldErrors
    showToast('Ein Fehler ist aufgetreten.', true)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Noten-Archiv</h2>

  <form v-if="ready" @submit.prevent="save">
    <div class="text-center my-4">
      <div class="my-3">
        <RouterLink
          class="btn btn-secondary"
          :to="
            id
              ? { name: 'repertoire-scores-show', params: { id } }
              : { name: 'repertoire-scores-search' }
          "
        >
          zurück
        </RouterLink>
      </div>
      <div class="my-3">
        <button class="btn btn-primary" type="submit" :disabled="submitting">speichern</button>
      </div>
    </div>
    <div class="card text-left mb-5">
      <div class="card-body">
        <ScoreDataComponent :score="score" />
        <ScoreFieldsComponent
          v-model="fields"
          :fields-config="fieldsConfig"
          :errors="fieldErrors"
        />
      </div>
    </div>
  </form>
</template>
