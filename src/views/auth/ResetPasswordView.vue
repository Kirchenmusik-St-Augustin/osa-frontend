<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
import { extractApiErrors } from '@/services/apiErrors'

const title = 'Passwort setzen'
const route = useRoute()
const router = useRouter()

const token = typeof route.query['token'] === 'string' ? route.query['token'] : ''
const email = ref(typeof route.query['email'] === 'string' ? route.query['email'] : '')
const password = ref('')
const passwordConfirmation = ref('')
const fieldErrors = ref<Record<string, string>>({})
const generalError = ref<string | null>(null)
const submitting = ref(false)

async function submit(): Promise<void> {
  fieldErrors.value = {}
  generalError.value = null
  submitting.value = true
  try {
    await api.post('/auth/reset-password', {
      email: email.value,
      token,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    await router.push({ name: 'login' })
  } catch (error) {
    const { fieldErrors: fe, generalError: ge } = extractApiErrors(error)
    fieldErrors.value = fe
    generalError.value = ge
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
        <div class="card-header">Passwort setzen</div>
        <div class="card-body">
          <form class="text-start" @submit.prevent="submit">
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
              <small class="text-danger">{{ fieldErrors['email'] || generalError }}</small>
            </div>
            <div class="mb-3">
              <label class="form-label" for="password">Passwort</label>
              <input id="password" v-model="password" type="password" class="form-control" />
              <small class="text-danger">{{ fieldErrors['password'] }}</small>
            </div>
            <div class="mb-3">
              <label class="form-label" for="password_confirmation">Passwort-Bestätigung</label>
              <input
                id="password_confirmation"
                v-model="passwordConfirmation"
                type="password"
                class="form-control"
                required
              />
              <small class="text-danger">{{ fieldErrors['password_confirmation'] }}</small>
            </div>
            <div class="mt-4 text-center">
              <button type="submit" class="btn btn-primary" :disabled="submitting">
                Passwort setzen
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
