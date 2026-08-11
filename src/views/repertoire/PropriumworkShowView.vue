<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePropriumworks, type Propriumwork } from '@/composables/usePropriumworks'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { get, remove } = usePropriumworks()

const work = ref<Propriumwork | null>(null)

const fields = computed(() => {
  if (!work.value) return []
  return [
    { label: 'Name', value: work.value.name },
    { label: 'Komponist', value: work.value.artist_name },
    { label: 'Beschreibung', value: work.value.description },
  ].filter((field) => field.value)
})

onMounted(async () => {
  work.value = await get(Number(props.id))
})

async function destroy(): Promise<void> {
  const confirmed = await confirmAction('Wirklich löschen?')
  if (!confirmed) return

  try {
    await remove(Number(props.id))
    showToast('gelöscht.')
    await router.push({ name: 'repertoire-propriumworks-search' })
  } catch (error) {
    const { fieldErrors } = extractApiErrors(error)
    showToast(
      fieldErrors['general'] ??
        'Die Proprium-Komposition kann nicht gelöscht werden, da sie im Kalender verwendet wird.',
      true,
    )
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Proprium-Komposition</h2>

  <div v-if="work" class="row justify-content-center mt-4">
    <div class="col-md-7">
      <div class="card p-4 text-left">
        <div v-for="field in fields" :key="field.label">
          <strong>{{ field.label }}</strong>
          <div class="mb-3">{{ field.value }}</div>
        </div>
        <div v-if="work.duration">
          <strong>Dauer</strong>
          <div class="mb-3">{{ work.duration }} Minuten</div>
        </div>
        <div v-if="work.demanding" class="text-danger mb-3">anspruchsvoll</div>
      </div>

      <div class="text-center my-4">
        <RouterLink
          class="btn btn-primary me-3"
          :to="{ name: 'repertoire-propriumworks-edit', params: { id } }"
        >
          bearbeiten
        </RouterLink>
        <button type="button" class="btn btn-danger" @click="destroy">löschen</button>
      </div>
      <div class="text-center">
        <RouterLink class="btn btn-primary" :to="{ name: 'repertoire-propriumworks-search' }">
          Zur Suche
        </RouterLink>
      </div>
    </div>
  </div>
</template>
