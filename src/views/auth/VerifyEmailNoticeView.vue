<script setup lang="ts">
// The blocking notice shown to a logged-in-but-unverified user, reached via
// router/guards.ts's redirect. Not to be confused with VerifyEmailView.vue
// (the token-consuming page, self-contained, no login required).
//
// A failed resend request (network error, or the endpoint's 6-per-minute
// rate limit) surfaces a short message, and the button stays disabled while
// a request is in flight, so repeated clicks cannot burn through the rate
// limit.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const RESEND_ERROR_MESSAGE =
  'Beim erneuten Versand ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.'

const authStore = useAuthStore()
const router = useRouter()

const verificationLinkSent = ref(false)
const submitting = ref(false)
const generalError = ref<string | null>(null)

async function submit(): Promise<void> {
  submitting.value = true
  generalError.value = null
  try {
    await authStore.resendVerificationEmail()
    verificationLinkSent.value = true
  } catch {
    generalError.value = RESEND_ERROR_MESSAGE
  } finally {
    submitting.value = false
  }
}

async function logout(): Promise<void> {
  await authStore.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <h2 class="h2 text-center mb-4">E-Mail-Prüfung</h2>
  <div class="row justify-content-center">
    <div class="col-md-6">
      <div class="card text-center">
        <div class="card-header">Anmeldung</div>
        <div class="card-body">
          <div class="mb-4">
            Die E-Mail-Adresse des Benutzerkontos ist derzeit nicht verifiziert.
          </div>
          <div class="mb-4">
            Um fortsetzen zu können, ist ein Klick auf den Bestätigungs-Link in der
            Überprüfungs-E-Mail notwendig, welche an die angegebene E-Mail-Adresse versandt wurde.
          </div>
          <div class="mb-4">
            Sollte die E-Mail nicht angekommen sein, kann sie durch Klick auf den Butten erneut
            versandt werden.
          </div>
          <div v-if="verificationLinkSent" class="mb-4">
            Die Überprüfungs-E-Mail wurde erneut versandt!
          </div>
          <form v-else @submit.prevent="submit">
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              Überprüfungs-E-Mail erneut senden
            </button>
            <small v-if="generalError" class="text-danger d-block mt-2">{{ generalError }}</small>
          </form>
        </div>
        <div class="card-footer">
          <a class="link-secondary text-decoration-none c-pointer" @click="logout">Log out</a>
        </div>
      </div>
    </div>
  </div>
</template>
