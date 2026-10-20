<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { extractApiErrors } from '@/services/apiErrors'

const title = 'Registrierung'
const authStore = useAuthStore()

const givenname = ref('')
const surname = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const fieldErrors = ref<Record<string, string>>({})
const submitting = ref(false)
const notice = ref('')

async function submit(): Promise<void> {
  fieldErrors.value = {}
  submitting.value = true
  try {
    notice.value = await authStore.register({
      givenname: givenname.value,
      surname: surname.value,
      email: email.value,
      phone: phone.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
  } catch (error) {
    const { fieldErrors: fe } = extractApiErrors(error)
    fieldErrors.value = fe
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">{{ title }}</h2>
  <div class="row justify-content-center">
    <div class="col-md-6">
      <div class="card text-center">
        <div class="card-header">Erst-Registrierung</div>
        <div class="card-body">
          <div v-if="notice" class="mt-2 mb-2" role="status">
            <strong>{{ notice }}</strong>
          </div>
          <form v-else class="text-start" @submit.prevent="submit">
            <div class="mb-2">
              <label class="form-label" for="givenname">Vorname</label>
              <input
                id="givenname"
                v-model="givenname"
                type="text"
                class="form-control"
                required
                autofocus
              />
              <small class="text-danger">{{ fieldErrors['givenname'] }}</small>
            </div>
            <div class="mb-2">
              <label class="form-label" for="surname">Nachname</label>
              <input id="surname" v-model="surname" type="text" class="form-control" required />
              <small class="text-danger">{{ fieldErrors['surname'] }}</small>
            </div>
            <div class="mb-2">
              <label class="form-label" for="email">E-Mail</label>
              <input id="email" v-model="email" type="email" class="form-control" required />
              <small class="text-danger">{{ fieldErrors['email'] }}</small>
            </div>
            <div class="mb-2">
              <label class="form-label" for="phone">Telefon</label>
              <input id="phone" v-model="phone" type="tel" class="form-control" required />
              <small class="text-danger">{{ fieldErrors['phone'] }}</small>
            </div>
            <div class="mb-2">
              <label class="form-label" for="password">Passwort</label>
              <input
                id="password"
                v-model="password"
                type="password"
                class="form-control"
                required
                autocomplete="new-password"
              />
              <small class="text-danger">{{ fieldErrors['password'] }}</small>
            </div>
            <div class="mb-2">
              <label class="form-label" for="password_confirmation">Passwort-Bestätigung</label>
              <input
                id="password_confirmation"
                v-model="passwordConfirmation"
                type="password"
                class="form-control"
                required
                autocomplete="new-password"
              />
              <div class="form-check-label small text-danger">
                {{ fieldErrors['password_confirmation'] }}
              </div>
            </div>
            <div class="text-center">
              <button type="submit" class="btn btn-primary" :disabled="submitting">
                Registrieren
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
