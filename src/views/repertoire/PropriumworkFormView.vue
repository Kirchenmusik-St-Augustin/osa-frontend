<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import FormInput from '@/components/common/FormInput.vue'
import FormSelect from '@/components/common/FormSelect.vue'
import FormCheckbox from '@/components/common/FormCheckbox.vue'
import { useArtists, type ArtistSearchResult } from '@/composables/useArtists'
import { usePropriumworks } from '@/composables/usePropriumworks'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const { listComposers } = useArtists()
const { get, create, update } = usePropriumworks()

const form = reactive({
  name: '',
  description: '' as string | null,
  artist_id: null as number | null,
  duration: null as number | string | null,
  demanding: false,
})
const artists = ref<ArtistSearchResult[]>([])
const fieldErrors = ref<Record<string, string>>({})
const submitting = ref(false)
const ready = ref(false)

onMounted(async () => {
  artists.value = await listComposers()

  if (props.id) {
    const work = await get(Number(props.id))
    form.name = work.name
    form.description = work.description
    form.artist_id = work.artist_id
    form.duration = work.duration
    form.demanding = work.demanding
  }
  ready.value = true
})

function toNullableNumber(value: number | string | null): number | null {
  if (value === '' || value === null) return null
  return Number(value)
}

async function save(): Promise<void> {
  const confirmed = await confirmAction('Wirklich speichern?')
  if (!confirmed) return

  submitting.value = true
  fieldErrors.value = {}
  const payload = {
    name: form.name,
    description: form.description || null,
    artist_id: form.artist_id as number,
    duration: toNullableNumber(form.duration),
    demanding: form.demanding,
  }

  try {
    const work = props.id ? await update(Number(props.id), payload) : await create(payload)
    showToast('gespeichert.')
    await router.push({ name: 'repertoire-propriumworks-show', params: { id: work.id } })
  } catch (error) {
    fieldErrors.value = extractApiErrors(error).fieldErrors
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Proprium-Komposition bearbeiten</h2>

  <div v-if="ready" class="row justify-content-center mt-4">
    <div class="col-md-7">
      <div class="card p-4 text-left">
        <FormInput
          id="propriumwork-name"
          v-model="form.name"
          title="Name"
          required
          :error="fieldErrors['name']"
        />
        <FormSelect
          id="propriumwork-artist"
          v-model="form.artist_id"
          title="Komponist"
          :options="artists"
          :error="fieldErrors['artist_id']"
        />
        <FormInput
          id="propriumwork-description"
          v-model="form.description"
          title="Beschreibung"
          type="textarea"
          :error="fieldErrors['description']"
        />
        <FormInput
          id="propriumwork-duration"
          v-model="form.duration"
          title="Dauer (Minuten)"
          type="number"
          required
          :error="fieldErrors['duration']"
        />
        <FormCheckbox id="propriumwork-demanding" v-model="form.demanding" title="anspruchsvoll" />
      </div>

      <div class="text-center my-4">
        <button type="button" class="btn btn-primary me-3" :disabled="submitting" @click="save">
          speichern
        </button>
        <RouterLink
          class="btn btn-secondary"
          :to="
            id
              ? { name: 'repertoire-propriumworks-show', params: { id } }
              : { name: 'repertoire-propriumworks-search' }
          "
        >
          zurück
        </RouterLink>
      </div>
    </div>
  </div>
</template>
