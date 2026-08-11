<script setup lang="ts">
// 1:1 port of Legacy's Pages/Auth/VerifyEmail.vue -- the blocking notice
// shown to a logged-in-but-unverified user, reached via router/guards.ts's
// redirect. Not to be confused with VerifyEmailView.vue (the token-
// consuming page, self-contained, no login required).
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const verificationLinkSent = ref(false)

async function submit(): Promise<void> {
  await authStore.resendVerificationEmail()
  verificationLinkSent.value = true
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
            <button type="submit" class="btn btn-primary">Überprüfungs-E-Mail erneut senden</button>
          </form>
        </div>
        <div class="card-footer">
          <a class="link-secondary text-decoration-none c-pointer" @click="logout">Log out</a>
        </div>
      </div>
    </div>
  </div>
</template>
