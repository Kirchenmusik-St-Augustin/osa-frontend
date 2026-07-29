<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import FormInput from '@/components/common/FormInput.vue'
import FormSelect from '@/components/common/FormSelect.vue'
import FormCheckbox from '@/components/common/FormCheckbox.vue'
import QuantityEditor from '@/components/common/QuantityEditor.vue'
import { useArtists, type ArtistSearchResult } from '@/composables/useArtists'
import {
  useOrdinariumworks,
  type AvailablePositions,
  type PositionEntry,
} from '@/composables/useOrdinariumworks'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const { listComposers } = useArtists()
const { get, getSetup, getAvailablePositions, create, update } = useOrdinariumworks()

const form = reactive({
  name: '',
  description: '' as string | null,
  artist_id: null as number | null,
  duration: null as number | string | null,
  demanding: false,
  setup: {
    instruments: [] as PositionEntry[],
    voices: [] as PositionEntry[],
  },
})
const artists = ref<ArtistSearchResult[]>([])
const available = ref<AvailablePositions>({ instruments: [], voices: [] })
const fieldErrors = ref<Record<string, string>>({})
const submitting = ref(false)
// QuantityEditor snapshots its model at creation time to power the
// "reset to original values" link -- gating the form behind `ready` means
// it's only ever mounted once every async fetch (composer list, available
// positions, and -- on edit -- the existing work/setup) has resolved,
// matching Legacy's SSR props being complete before the component exists.
const ready = ref(false)

onMounted(async () => {
  const [composerArtists, availablePositions] = await Promise.all([
    listComposers(),
    getAvailablePositions(),
  ])
  artists.value = composerArtists
  available.value = availablePositions

  if (props.id) {
    const [work, setup] = await Promise.all([get(Number(props.id)), getSetup(Number(props.id))])
    form.name = work.name
    form.description = work.description
    form.artist_id = work.artist_id
    form.duration = work.duration
    form.demanding = work.demanding
    form.setup.instruments = setup.instruments
    form.setup.voices = setup.voices
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
    setup: {
      instruments: form.setup.instruments.map(({ id, quantity }) => ({ id, quantity })),
      voices: form.setup.voices.map(({ id, quantity }) => ({ id, quantity })),
    },
  }

  try {
    const work = props.id ? await update(Number(props.id), payload) : await create(payload)
    showToast('gespeichert.')
    await router.push({ name: 'repertoire-ordinariumworks-show', params: { id: work.id } })
  } catch (error) {
    fieldErrors.value = extractApiErrors(error).fieldErrors
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Ordinarium-Komposition bearbeiten</h2>

  <div v-if="ready" class="row justify-content-center mt-4">
    <div class="col-md-7">
      <div class="card p-4 text-left">
        <FormInput
          id="ordinariumwork-name"
          v-model="form.name"
          title="Name"
          required
          :error="fieldErrors['name']"
        />
        <FormSelect
          id="ordinariumwork-artist"
          v-model="form.artist_id"
          title="Komponist"
          :options="artists"
          :error="fieldErrors['artist_id']"
        />
        <FormInput
          id="ordinariumwork-description"
          v-model="form.description"
          title="Beschreibung"
          type="textarea"
          :error="fieldErrors['description']"
        />
        <FormInput
          id="ordinariumwork-duration"
          v-model="form.duration"
          title="Dauer (Minuten)"
          type="number"
          required
          :error="fieldErrors['duration']"
        />
        <FormCheckbox
          id="ordinariumwork-demanding"
          v-model="form.demanding"
          title="anspruchsvoll"
        />

        <strong class="mt-2">Instrumente</strong>
        <QuantityEditor v-model="form.setup.instruments" :available="available.instruments" />
        <strong class="mt-2">Stimmen</strong>
        <QuantityEditor v-model="form.setup.voices" :available="available.voices" />
        <small v-if="fieldErrors['setup']" class="text-danger">{{ fieldErrors['setup'] }}</small>
      </div>

      <div class="text-center my-4">
        <button type="button" class="btn btn-primary me-3" :disabled="submitting" @click="save">
          speichern
        </button>
        <RouterLink
          class="btn btn-secondary"
          :to="
            id
              ? { name: 'repertoire-ordinariumworks-show', params: { id } }
              : { name: 'repertoire-ordinariumworks-search' }
          "
        >
          zurück
        </RouterLink>
      </div>
    </div>
  </div>
</template>
