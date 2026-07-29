<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { extractApiErrors } from '@/services/apiErrors'

// Self-contained via the token in the URL alone -- no prior login required
// (see the backend's verify_email endpoint docstring). Structurally
// different from Legacy's VerifyEmail.vue (a blocking "please verify,
// click to resend" gate shown to an already-logged-in-but-unverified
// user), since our itsdangerous token already carries everything needed
// to identify+verify the target user, with no separate login step first.
const title = 'E-Mail-Prüfung'
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

type VerificationStatus = 'pending' | 'success' | 'error'
const status = ref<VerificationStatus>('pending')
const errorMessage = ref<string | null>(null)

onMounted(async () => {
  const token = typeof route.query['token'] === 'string' ? route.query['token'] : ''
  if (!token) {
    status.value = 'error'
    errorMessage.value = 'Der Bestätigungslink ist ungültig oder abgelaufen.'
    return
  }
  try {
    await authStore.verifyEmail(token)
    status.value = 'success'
  } catch (error) {
    status.value = 'error'
    errorMessage.value = extractApiErrors(error).generalError
  }
})

async function goToHome(): Promise<void> {
  await router.push({ name: 'home' })
}
</script>

<template>
  <h2 class="h2 text-center mb-4">{{ title }}</h2>
  <div class="row justify-content-center">
    <div class="col-md-6">
      <div class="card text-center">
        <div class="card-header">Anmeldung</div>
        <div class="card-body">
          <div v-if="status === 'pending'" class="mb-4">Die E-Mail-Adresse wird geprüft...</div>
          <div v-else-if="status === 'success'" class="mb-4">
            <strong>Die E-Mail-Adresse wurde erfolgreich bestätigt.</strong>
            <div class="mt-3">
              <button type="button" class="btn btn-primary" @click="goToHome">Weiter</button>
            </div>
          </div>
          <div v-else class="mb-4">
            <strong class="text-danger">{{ errorMessage }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
