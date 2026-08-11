<script setup lang="ts">
// 1:1 port of Legacy's Content/System/Users/Form.vue.
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import FormCheckbox from '@/components/common/FormCheckbox.vue'
import FormInput from '@/components/common/FormInput.vue'
import SelectionSetup, { type SelectableItem } from '@/components/common/SelectionSetup.vue'
import { useUsers, type UserFormOptions } from '@/composables/useUsers'
import { extractApiErrors } from '@/services/apiErrors'
import { formatUtcDateTime } from '@/services/dateFormat'
import { confirmAction, showToast } from '@/services/notifications'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const authStore = useAuthStore()
const { get, getFormOptions, create, update } = useUsers()

const form = reactive({
  givenname: '',
  surname: '',
  email: '' as string | null,
  phone: '' as string | null,
  auth_locked: false,
  instruments: [] as SelectableItem[],
  voices: [] as SelectableItem[],
  choirjobs: [] as SelectableItem[],
  roles: [] as SelectableItem[],
  administrator: false,
})
const fieldErrors = ref<Record<string, string>>({})
const submitting = ref(false)
const options = ref<UserFormOptions | null>(null)

// Loaded-at-mount snapshot, not reactively tracked afterward -- 1:1
// Legacy's `const initialEmail = form.email` (captured once, right after
// useForm() is seeded from the server response).
let initialEmail: string | null = null
const emailVerifiedAt = ref<string | null>(null)
const emailTouched = computed(() => initialEmail !== form.email)

onMounted(async () => {
  options.value = await getFormOptions()
  if (!props.id) return

  const user = await get(Number(props.id))
  form.givenname = user.givenname
  form.surname = user.surname
  form.email = user.email
  form.phone = user.phone
  form.auth_locked = user.auth_locked
  form.instruments = user.instruments
  form.voices = user.voices
  form.choirjobs = user.choirjobs
  form.roles = user.roles
  form.administrator = user.administrator
  initialEmail = user.email
  emailVerifiedAt.value = user.email_verified_at
})

// Legacy quirk (Form.vue): the "Benutzerkonto erstellen" subtitle has no
// v-else on its own `page-subtitle` call, so it renders unconditionally --
// even on Edit, alongside the name subtitle. Replicated 1:1 here, not
// "fixed".
const nameSubtitle = computed(() =>
  form.surname && form.givenname ? `${form.surname.toUpperCase()}, ${form.givenname}` : '',
)

async function save(): Promise<void> {
  const confirmed = await confirmAction('Wirklich speichern?')
  if (!confirmed) return

  submitting.value = true
  fieldErrors.value = {}
  const payload = {
    givenname: form.givenname,
    surname: form.surname,
    email: form.email || null,
    phone: form.phone || null,
    auth_locked: form.auth_locked,
    instruments: form.instruments.map((item) => item.id),
    voices: form.voices.map((item) => item.id),
    choirjobs: form.choirjobs.map((item) => item.id),
    roles: form.roles.map((item) => item.id),
    administrator: form.administrator,
  }

  try {
    const user = props.id ? await update(Number(props.id), payload) : await create(payload)
    showToast('gespeichert.')
    await router.push({ name: 'system-users-show', params: { id: user.id } })
  } catch (error) {
    fieldErrors.value = extractApiErrors(error).fieldErrors
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Benutzerkonto verwalten</h2>
  <p v-if="nameSubtitle" class="h4 text-center mb-1">{{ nameSubtitle }}</p>
  <p class="h4 text-center mb-4">Benutzerkonto erstellen</p>

  <div v-if="options" class="row justify-content-center mt-4">
    <div class="col-md-7">
      <div class="card my-4">
        <div class="card-body">
          <FormInput
            id="user-givenname"
            v-model="form.givenname"
            title="Vorname"
            required
            :error="fieldErrors['givenname']"
          />
          <FormInput
            id="user-surname"
            v-model="form.surname"
            title="Nachname"
            required
            :error="fieldErrors['surname']"
          />
          <FormInput
            id="user-email"
            v-model="form.email"
            title="E-Mail"
            type="email"
            required
            :error="fieldErrors['email']"
          />
          <div class="mb-2">
            <small v-if="emailVerifiedAt && !emailTouched" class="text-black-50">
              E-Mail verifiziert: {{ formatUtcDateTime(emailVerifiedAt) }}
            </small>
            <small v-else-if="form.email && form.email.length" class="text-danger">
              E-mail nicht verifiziert
            </small>
            <small v-else class="text-danger">Pflichtfeld</small>
          </div>
          <FormInput
            id="user-phone"
            v-model="form.phone"
            title="Telefon"
            type="tel"
            required
            :error="fieldErrors['phone']"
          />

          <FormCheckbox
            id="user-auth-locked"
            v-model="form.auth_locked"
            title="Konto sperren"
            as-switch
          />

          <SelectionSetup
            v-model="form.instruments"
            title="Instrumente"
            :available="options.instruments"
          />
          <SelectionSetup v-model="form.voices" title="Stimmen" :available="options.voices" />
          <SelectionSetup
            v-model="form.choirjobs"
            title="Choraufgaben"
            :available="options.choirjobs"
          />
          <SelectionSetup
            v-if="authStore.user?.administrator"
            v-model="form.roles"
            title="Rollen"
            :available="options.roles"
          />

          <FormCheckbox
            v-if="authStore.user?.administrator"
            id="user-administrator"
            v-model="form.administrator"
            title="Administrator"
            as-switch
          />
        </div>
      </div>

      <div class="text-center my-4">
        <div class="my-3">
          <button type="button" class="btn btn-primary" :disabled="submitting" @click="save">
            speichern
          </button>
        </div>
        <div class="my-3">
          <RouterLink
            class="btn btn-secondary mb-3"
            :to="
              id ? { name: 'system-users-show', params: { id } } : { name: 'system-users-search' }
            "
          >
            zurück
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
