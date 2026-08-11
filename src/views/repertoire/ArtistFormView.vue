<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import FormInput from '@/components/common/FormInput.vue'
import FormCheckbox from '@/components/common/FormCheckbox.vue'
import { useArtists } from '@/composables/useArtists'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const { get, create, update } = useArtists()

const form = reactive({
  givenname: '',
  surname: '',
  description: '' as string | null,
  birthyear: null as number | string | null,
  deathyear: null as number | string | null,
  composer: false,
  conductor: false,
})
const fieldErrors = ref<Record<string, string>>({})
const submitting = ref(false)

onMounted(async () => {
  if (!props.id) return
  const artist = await get(Number(props.id))
  form.givenname = artist.givenname
  form.surname = artist.surname
  form.description = artist.description
  form.birthyear = artist.birthyear
  form.deathyear = artist.deathyear
  form.composer = artist.composer
  form.conductor = artist.conductor
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
    givenname: form.givenname,
    surname: form.surname,
    description: form.description || null,
    birthyear: toNullableNumber(form.birthyear),
    deathyear: toNullableNumber(form.deathyear),
    composer: form.composer,
    conductor: form.conductor,
  }

  try {
    const artist = props.id ? await update(Number(props.id), payload) : await create(payload)
    showToast('gespeichert.')
    await router.push({ name: 'repertoire-artists-show', params: { id: artist.id } })
  } catch (error) {
    fieldErrors.value = extractApiErrors(error).fieldErrors
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Komponist/Dirigent bearbeiten</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-md-7">
      <div class="card p-4 text-left">
        <FormInput
          id="artist-givenname"
          v-model="form.givenname"
          title="Vorname"
          required
          :error="fieldErrors['givenname']"
        />
        <FormInput
          id="artist-surname"
          v-model="form.surname"
          title="Nachname"
          required
          :error="fieldErrors['surname']"
        />
        <FormInput
          id="artist-description"
          v-model="form.description"
          title="Beschreibung"
          type="textarea"
          :error="fieldErrors['description']"
        />
        <div class="row">
          <div class="col-sm-6">
            <FormInput
              id="artist-birthyear"
              v-model="form.birthyear"
              title="Geburtsjahr"
              type="number"
              :error="fieldErrors['birthyear']"
            />
          </div>
          <div class="col-sm-6">
            <FormInput
              id="artist-deathyear"
              v-model="form.deathyear"
              title="Todesjahr"
              type="number"
              :error="fieldErrors['deathyear']"
            />
          </div>
        </div>
        <div class="row">
          <div class="col-sm-6">
            <FormCheckbox
              id="artist-composer"
              v-model="form.composer"
              title="Komponist"
              as-switch
            />
          </div>
          <div class="col-sm-6">
            <FormCheckbox
              id="artist-conductor"
              v-model="form.conductor"
              title="Dirigent"
              as-switch
            />
          </div>
        </div>
      </div>

      <div class="text-center my-4">
        <button type="button" class="btn btn-primary me-3" :disabled="submitting" @click="save">
          speichern
        </button>
        <RouterLink
          class="btn btn-secondary"
          :to="
            id
              ? { name: 'repertoire-artists-show', params: { id } }
              : { name: 'repertoire-artists-search' }
          "
        >
          zurück
        </RouterLink>
      </div>
    </div>
  </div>
</template>
