<script setup lang="ts">
// 1:1 port of Legacy's Content/Common/Selfadmin/Profile/Form.vue. Unlike
// UserFormView.vue (System-admin form), email/phone are required here and
// there's no "E-Mail verifiziert"-hint line -- deliberate Legacy
// differences, not omissions (see app/schemas/profile.py docstring).
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import FormCheckbox from '@/components/common/FormCheckbox.vue'
import FormInput from '@/components/common/FormInput.vue'
import { useProfile } from '@/composables/useProfile'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'

const router = useRouter()
const { get, update } = useProfile()

const form = reactive({
  givenname: '',
  surname: '',
  email: '',
  phone: '',
  change_password: false,
  password: '',
  password_confirmation: '',
  auth_password: '',
})
const fieldErrors = ref<Record<string, string>>({})
const submitting = ref(false)

onMounted(async () => {
  const user = await get()
  form.givenname = user.givenname
  form.surname = user.surname
  form.email = user.email ?? ''
  form.phone = user.phone ?? ''
})

async function save(): Promise<void> {
  const confirmed = await confirmAction('Wirklich speichern?')
  if (!confirmed) return

  submitting.value = true
  fieldErrors.value = {}
  const payload = {
    givenname: form.givenname,
    surname: form.surname,
    email: form.email,
    phone: form.phone,
    change_password: form.change_password,
    password: form.change_password ? form.password : null,
    password_confirmation: form.change_password ? form.password_confirmation : null,
    auth_password: form.auth_password,
  }

  try {
    await update(payload)
    showToast('gespeichert.')
    await router.push({ name: 'selfadmin-profile-show' })
  } catch (error) {
    fieldErrors.value = extractApiErrors(error).fieldErrors
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Persönliche Daten bearbeiten</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-md-6">
      <div class="card text-start">
        <div class="card-body">
          <FormInput
            id="profile-givenname"
            v-model="form.givenname"
            title="Vorname"
            required
            :error="fieldErrors['givenname']"
          />
          <FormInput
            id="profile-surname"
            v-model="form.surname"
            title="Nachname"
            required
            :error="fieldErrors['surname']"
          />
          <FormInput
            id="profile-email"
            v-model="form.email"
            title="E-Mail"
            type="email"
            required
            :error="fieldErrors['email']"
          />
          <FormInput
            id="profile-phone"
            v-model="form.phone"
            title="Telefon"
            type="tel"
            required
            :error="fieldErrors['phone']"
          />

          <FormCheckbox
            id="profile-change-password"
            v-model="form.change_password"
            title="Passwort setzen"
            as-switch
          />
          <br />
          <div v-if="form.change_password" class="card p-1">
            <div class="card-body bg-light">
              <div class="mb-2">
                <FormInput
                  id="profile-password"
                  v-model="form.password"
                  title="Neues Passwort"
                  type="password"
                  required
                  :error="fieldErrors['password']"
                />
              </div>
              <div class="mb-2">
                <FormInput
                  id="profile-password-confirmation"
                  v-model="form.password_confirmation"
                  title="Neues Passwort bestätigen"
                  type="password"
                  required
                  :error="fieldErrors['password_confirmation']"
                />
              </div>
            </div>
          </div>

          <div class="mt-4">
            <div class="card border-danger p-1">
              <div class="card-body bg-light">
                <div class="mb-2">
                  Um Änderungen der persönlichen Daten zu speichern, muss das aktuelle Passwort
                  eingegeben werden.
                </div>
                <FormInput
                  id="profile-auth-password"
                  v-model="form.auth_password"
                  title="Aktuelles Passwort"
                  type="password"
                  required
                  :error="fieldErrors['auth_password']"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center my-4">
        <div class="my-3">
          <button type="button" class="btn btn-primary" :disabled="submitting" @click="save">
            speichern
          </button>
        </div>
        <div class="my-3">
          <RouterLink class="btn btn-secondary" :to="{ name: 'selfadmin-profile-show' }">
            zurück
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
