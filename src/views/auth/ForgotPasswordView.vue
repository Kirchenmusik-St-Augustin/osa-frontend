<script setup lang="ts">
import { ref } from 'vue'
import { extractApiErrors } from '@/services/apiErrors'
import { useAuthStore } from '@/stores/auth'

const title = 'Passwort setzen'
const authStore = useAuthStore()

const email = ref('')
const fieldErrors = ref<Record<string, string>>({})
const submitting = ref(false)
const submitted = ref(false)

async function submit(): Promise<void> {
  fieldErrors.value = {}
  submitting.value = true
  try {
    await authStore.forgotPassword(email.value)
    submitted.value = true
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
        <div class="card-header">Anmeldung</div>
        <div class="card-body">
          <div class="mb-4">
            Im Falle eines vergessenen Passwortes kann hier unter Angabe der registrierten
            E-Mail-Adresse ein neues Passwort gesetzt werden.
          </div>
          <div v-if="submitted" class="mt-4">
            <strong>
              Sollte die angegebene Adresse registriert sein, wird eine E-Mail mit einem
              Rücksetzungs-Link versandt.
            </strong>
          </div>
          <form v-else class="text-start" @submit.prevent="submit">
            <div class="mb-3">
              <label class="form-label" for="email">E-Mail</label>
              <input
                id="email"
                v-model="email"
                type="email"
                class="form-control"
                required
                autofocus
                autocomplete="username"
              />
              <small class="text-danger">{{ fieldErrors['email'] }}</small>
            </div>
            <div class="text-center">
              <button type="submit" class="btn btn-primary" :disabled="submitting">
                Passwort-Reset-Link als Email erhalten
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
