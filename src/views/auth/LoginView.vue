<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import type { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { extractApiErrors } from '@/services/apiErrors'
import { googleClientId } from '@/runtimeConfig'
import { useGoogleSignIn } from '@/composables/useGoogleSignIn'

const title = 'Login'
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const fieldErrors = ref<Record<string, string>>({})
const submitting = ref(false)

// Zero-Trust: `redirect` comes from an attacker-craftable query string (a
// phishing link to our own /login?redirect=<target>), so a same-path check
// is required before ever handing it to router.push() -- rejects
// protocol-relative ("//evil.example.com") and absolute URLs alike, only
// same-app paths starting with a single "/" are allowed through.
function isSafeRedirectPath(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
}

async function redirectAfterLogin(): Promise<void> {
  const redirect = route.query['redirect']
  await router.push(isSafeRedirectPath(redirect) ? redirect : { name: 'home' })
}

async function submit(): Promise<void> {
  fieldErrors.value = {}
  submitting.value = true
  try {
    await authStore.login(email.value, password.value)
    await redirectAfterLogin()
  } catch (error) {
    // Hard Legacy parity: login failures (unknown email, wrong password,
    // throttled, locked account) render in the SAME visual slot as
    // Legacy's `form.errors.email` -- there is no separate banner.
    const { fieldErrors: fe, generalError } = extractApiErrors(error)
    fieldErrors.value = generalError ? { email: generalError, ...fe } : fe
  } finally {
    submitting.value = false
  }
}

// Google Sign-In: ID-token ("credential") flow via Google Identity Services,
// not Legacy's server-redirect Socialite dance (see the backend's
// google_callback endpoint docstring for the full reasoning) -- same
// business capability (log in if already linked, link via local password
// if not linked yet), leaner mechanism given this backend is stateless-JWT.
const showLinkForm = ref(false)
const pendingCredential = ref<string | null>(null)
const linkPassword = ref('')
const linkFieldErrors = ref<Record<string, string>>({})
const googleError = ref<string | null>(null)

async function handleGoogleCredential(credential: string): Promise<void> {
  googleError.value = null
  try {
    await authStore.loginWithGoogleCredential(credential)
    await redirectAfterLogin()
  } catch (error) {
    const axiosError = error as AxiosError
    if (axiosError.response?.status === 404) {
      pendingCredential.value = credential
      showLinkForm.value = true
      return
    }
    const { generalError } = extractApiErrors(error)
    googleError.value = generalError
  }
}

async function submitLinkAccount(): Promise<void> {
  if (!pendingCredential.value) return
  linkFieldErrors.value = {}
  try {
    await authStore.linkGoogleAccount(pendingCredential.value, email.value, linkPassword.value)
    await redirectAfterLogin()
  } catch (error) {
    const { fieldErrors: fe, generalError } = extractApiErrors(error)
    linkFieldErrors.value = generalError ? { email: generalError, ...fe } : fe
  }
}

const buttonContainer = useTemplateRef<HTMLDivElement>('google-signin-button')
useGoogleSignIn(buttonContainer, handleGoogleCredential)
</script>

<template>
  <h2 class="h2 text-center mb-4">{{ title }}</h2>
  <div class="row justify-content-center">
    <div class="col-md-6">
      <div class="card text-center">
        <div class="card-header">Anmeldung.</div>
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
              <small class="text-danger">{{ fieldErrors['email'] }}</small>
            </div>
            <div class="mb-3">
              <label class="form-label" for="password">Passwort</label>
              <input
                id="password"
                v-model="password"
                type="password"
                class="form-control"
                required
              />
            </div>
            <div class="text-center">
              <button type="submit" class="btn btn-primary" :disabled="submitting">Anmelden</button>
              <div v-if="googleClientId()" id="google-signin-button-wrapper" class="small mt-3">
                <div ref="google-signin-button"></div>
                <small v-if="googleError" class="text-danger">{{ googleError }}</small>
              </div>
            </div>
          </form>
        </div>
        <div class="card-footer text-body-secondary">
          <div class="row">
            <div class="col-md-6 justify-content-center">
              <RouterLink class="link-secondary text-decoration-none" :to="{ name: 'register' }">
                Erst-Registrierung
              </RouterLink>
            </div>
            <div class="col-md-6 justify-content-center">
              <RouterLink
                class="link-secondary text-decoration-none"
                :to="{ name: 'forgot-password' }"
              >
                Passwort-Rücksetzung
              </RouterLink>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showLinkForm" class="card text-center mt-4">
        <div class="card-header">Authentisierung zur Konten-Verknüpfung</div>
        <div class="card-body">
          <form class="text-start" @submit.prevent="submitLinkAccount">
            <div class="mb-3">
              <label class="form-label" for="link-email">E-Mail</label>
              <input
                id="link-email"
                v-model="email"
                type="email"
                class="form-control"
                required
                autofocus
                autocomplete="username"
              />
              <small class="text-danger">{{ linkFieldErrors['email'] }}</small>
            </div>
            <div class="mb-3">
              <label class="form-label" for="link-password">Passwort</label>
              <input
                id="link-password"
                v-model="linkPassword"
                type="password"
                class="form-control"
              />
            </div>
            <div class="text-center">
              <button type="submit" class="btn btn-primary">Anmelden</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
