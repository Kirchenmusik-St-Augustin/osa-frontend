<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useArtists, type Artist } from '@/composables/useArtists'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { get, remove } = useArtists()

const artist = ref<Artist | null>(null)

const fields = computed(() => {
  if (!artist.value) return []
  return [
    { label: 'Vorname', value: artist.value.givenname },
    { label: 'Nachname', value: artist.value.surname },
    { label: 'Beschreibung', value: artist.value.description },
    { label: 'Geburtsjahr', value: artist.value.birthyear },
    { label: 'Todesjahr', value: artist.value.deathyear },
  ].filter((field) => field.value)
})

const listedAs = computed(() => {
  if (!artist.value) return []
  const labels: string[] = []
  if (artist.value.composer) labels.push('Komponist')
  if (artist.value.conductor) labels.push('Dirigent')
  return labels
})

onMounted(async () => {
  artist.value = await get(Number(props.id))
})

async function destroy(): Promise<void> {
  const confirmed = await confirmAction('Wirklich löschen?')
  if (!confirmed) return

  try {
    await remove(Number(props.id))
    showToast('gelöscht.')
    await router.push({ name: 'repertoire-artists-search' })
  } catch (error) {
    const { fieldErrors } = extractApiErrors(error)
    showToast(
      fieldErrors['general'] ??
        'Komponist / Dirigent kann nicht gelöscht werden, da noch in Verwendung.',
      true,
    )
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Komponist / Dirigent</h2>

  <div v-if="artist" class="row justify-content-center mt-4">
    <div class="col-md-7">
      <div class="card p-4 text-left">
        <div v-for="field in fields" :key="field.label">
          <strong>{{ field.label }}</strong>
          <div class="mb-3">{{ field.value }}</div>
        </div>
        <div v-if="listedAs.length">
          <strong>Gelistet als</strong>
          <div v-for="label in listedAs" :key="label">{{ label }}</div>
        </div>
      </div>

      <div class="text-center my-4">
        <RouterLink
          class="btn btn-primary me-3"
          :to="{ name: 'repertoire-artists-edit', params: { id } }"
        >
          bearbeiten
        </RouterLink>
        <button type="button" class="btn btn-danger" @click="destroy">löschen</button>
      </div>
      <div class="text-center">
        <RouterLink class="btn btn-primary" :to="{ name: 'repertoire-artists-search' }">
          Zur Suche
        </RouterLink>
      </div>
    </div>
  </div>
</template>
