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
  // Default is the SAME-ORIGIN relative path, per CLAUDE.md: "Default im
  // Same-Domain-Betrieb: relativer Pfad /api". OSA's Caddy split is
  // path-based (not subdomain-based like the vb-fastapi-vue sister
  // project), so this default deliberately differs from there.
  return readRuntimeConfig('API_BASE_URL') || import.meta.env.VITE_API_BASE_URL || '/api'
}

export function appEnvironment(): string | undefined {
  return readRuntimeConfig('APP_ENVIRONMENT') || import.meta.env.VITE_APP_ENVIRONMENT
}
