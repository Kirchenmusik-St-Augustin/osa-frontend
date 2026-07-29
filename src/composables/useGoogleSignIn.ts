import { onMounted, type Ref } from 'vue'
import { googleClientId } from '@/runtimeConfig'

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }): void
  renderButton(element: HTMLElement, options: { theme: string; size: string }): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
let gsiScriptPromise: Promise<void> | null = null

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  gsiScriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'))
    document.head.appendChild(script)
  })
  return gsiScriptPromise
}

// Renders Google's own "Sign in with Google" button into the given
// template ref's element, only when a client ID is configured (see
// runtimeConfig.ts googleClientId()) -- an unconfigured deployment simply
// shows no button, matching the backend's own GOOGLE_CLIENT_ID-optional
// pattern (require_setting() at first use, not a boot-time requirement).
// Takes an existing template ref (created by the caller via
// useTemplateRef()) rather than creating+returning its own -- keeps ref
// ownership with the component that declares the `ref="..."` template
// attribute, which is what Vue's own typed-template-ref checking expects.
export function useGoogleSignIn(
  buttonContainer: Readonly<Ref<HTMLElement | null>>,
  onCredential: (credential: string) => void,
): void {
  onMounted(async () => {
    const clientId = googleClientId()
    if (!clientId || !buttonContainer.value) return

    await loadGsiScript()
    if (!window.google || !buttonContainer.value) return

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredential(response.credential),
    })
    window.google.accounts.id.renderButton(buttonContainer.value, {
      theme: 'outline',
      size: 'large',
    })
  })
}
