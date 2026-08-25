// Central runtime-configuration reader. Production: the nginx entrypoint
// (docker/docker-entrypoint.d/40-generate-runtime-config.sh) renders
// config.js from real container env vars before nginx starts. Dev/vitest:
// window.__APP_CONFIG__ is absent, so this falls through to
// import.meta.env.VITE_* build-time vars, then to a literal default.
declare global {
  interface Window {
    __APP_CONFIG__?: Record<string, string>
  }
}

function readRuntimeConfig(key: string): string | undefined {
  return window.__APP_CONFIG__?.[key]
}

export function apiBaseUrl(): string {
  // Default is the SAME-ORIGIN relative path (default in same-domain
  // operation: relative path /api). OSA's Caddy split is
  // path-based (not subdomain-based like the vb-fastapi-vue sister
  // project), so this default deliberately differs from there.
  return readRuntimeConfig('API_BASE_URL') || import.meta.env.VITE_API_BASE_URL || '/api'
}

// Required-ness is enforced at the process level, not here: vite.config.ts's
// validateViteEnv() (see vite.env-check.ts) exits the dev server/build
// process immediately if VITE_APP_ENVIRONMENT is unset or invalid, and the
// prod entrypoint script's require_env does the same for the container.
// By the time any app code runs in a browser, a valid value is therefore
// already guaranteed -- this getter itself stays a plain, non-throwing read.
export function appEnvironment(): string | undefined {
  return readRuntimeConfig('APP_ENVIRONMENT') || import.meta.env.VITE_APP_ENVIRONMENT
}

export function googleClientId(): string | undefined {
  // Optional -- absent/empty means the Google Sign-In button simply
  // doesn't render (see LoginView.vue), not a startup failure.
  return readRuntimeConfig('GOOGLE_CLIENT_ID') || import.meta.env.VITE_GOOGLE_CLIENT_ID
}
