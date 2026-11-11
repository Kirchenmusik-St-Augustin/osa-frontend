# osa-frontend

[Deutsch](README.de.md)

Vue 3 SPA frontend for **OSA** ("Orchester-Einteilung") — the scheduling/
casting system for the church musicians of Kirchenmusik St. Augustin.
Talks to [`osa-backend`](https://github.com/Kirchenmusik-St-Augustin/osa-backend).

## Tech Stack

- **Framework:** Vue 3 (`<script setup>`, strict TypeScript), Vite, Pinia,
  Vue Router
- **UI:** Bootstrap 5 (styles only), FontAwesome, flatpickr
- **Prod serving:** nginx (static build), Podman Quadlets (rootless
  systemd) — quadlets for every stage, including local dev, live in
  [`osa-deploy`](https://github.com/Kirchenmusik-St-Augustin/osa-deploy)

## Runtime configuration model

The one genuinely non-obvious mechanism in this repo: **Vite's `VITE_*`
env vars are baked into the JS bundle at build time** — one Docker image
would otherwise be locked to one backend URL/environment forever. Instead,
the prod image ships a `public/config.template.js` placeholder, copied
verbatim into `dist/` by the build, and the container's own
`docker/docker-entrypoint.d/40-generate-runtime-config.sh` renders it into
a real `config.js` **at container start**, from actual runtime env vars
(`API_BASE_URL`, `APP_ENVIRONMENT`, optionally `GOOGLE_CLIENT_ID` — no
`VITE_` prefix, these are read by the running container, not baked into
the bundle). `src/runtimeConfig.ts` is what actually reads
`window.__APP_CONFIG__` at app startup. The script fails loudly (non-zero
exit, clear stderr message) if `API_BASE_URL` or `APP_ENVIRONMENT` is
missing or unsafe (`API_BASE_URL` must start with `/` or `https://`,
`APP_ENVIRONMENT` must be one of `development`, `test`, `qa`, `production`).
The container then refuses to start nginx rather than silently serving a
broken config.

This is what makes the SAME image deployable to dev, QA, and production
without a rebuild — only the container's env vars change.

## Development Setup

### Prerequisites

- Node.js (see `package.json`'s `engines.node`)
- Podman with the `osa-frontend` container running for the containerized
  dev workflow — see
  [`osa-deploy`'s README](https://github.com/Kirchenmusik-St-Augustin/osa-deploy/blob/main/README.md#6-local-development)
  for how to set this up from a fresh clone (Quadlet config ends up under
  `~/.config/containers/systemd/osa/osa-frontend/` on the dev host)

### After cloning

```bash
npm install
pre-commit install
```

Without `pre-commit install`, commits bypass eslint/prettier/vue-tsc
entirely — the CI pipeline runs the same checks.

```bash
npm run dev
```

### Running tests

```bash
podman exec osa-frontend npx vitest run
podman exec osa-frontend npx vitest run --coverage
```

> Vitest silently skips writing the coverage report if any test fails —
> a passing `--coverage` run without a report printed usually means a
> test actually failed further up; scroll up rather than trusting an
> empty coverage section.

### Linting, formatting & type checking

```bash
podman exec osa-frontend npx eslint . --max-warnings 0
podman exec osa-frontend npx eslint . --fix

podman exec osa-frontend npx prettier --check --experimental-cli src/
podman exec osa-frontend npx prettier --write --experimental-cli src/

podman exec osa-frontend npx vue-tsc --build
```

## Environment Variables

```bash
cp .env.example .env
```

Two separate mechanisms, not to be confused (see
[Runtime configuration model](#runtime-configuration-model) above):

- **`VITE_*`** (`.env`, this file) — build/dev-time only, used by
  `npm run dev`/`npm run build`. Never put secrets here — they end up in
  the public browser bundle. `VITE_DEV_ALLOWED_HOSTS` lists, comma-separated,
  the host names the dev server answers to besides localhost (the public
  dev domain behind the reverse proxy); without it Vite refuses that domain.
- **Non-`VITE_`** (`API_BASE_URL`, `APP_ENVIRONMENT`, `GOOGLE_CLIENT_ID`)
  — runtime-only, read by the running prod container, set via the vault-encrypted
  `sites/<stage>/secrets/osa-frontend.env.j2` of the private site repository
  `osa-access`, see [Secrets](https://github.com/Kirchenmusik-St-Augustin/osa-deploy/blob/main/README.md#71-secrets) in the `osa-deploy` README.

`GOOGLE_CLIENT_ID` is optional on both sides (frontend and
[backend](https://github.com/Kirchenmusik-St-Augustin/osa-backend/blob/main/README.md#environment-variables)) — leave it
empty/unset on a stage where Google's Developer Console isn't (or can't
be) configured, and the Google Sign-In button simply doesn't render on
that stage (`googleClientId()` in `src/runtimeConfig.ts`, checked by
`LoginView.vue`'s `v-if`). No separate feature-flag variable needed; the
client ID itself is the switch.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it
privately instead:

- through GitHub's private vulnerability reporting: the "Security and
  quality" tab of this repository, then "Report a vulnerability", or
- by e-mail to einteilung@hochamt.at.

Please include the affected version or commit, the steps to reproduce and
the impact you expect. We answer as soon as possible and keep you informed
while the problem is fixed.

## Branching

- `main` — protected, merge via PR only
- `development` — active development branch

## CI/CD

The pipeline (`.github/workflows/ci-cd.yml`) runs on every push to `main`,
every PR targeting `main`, weekly (Monday 06:00 UTC, CodeQL refresh), and
on manual dispatch:

1. **Lint & Format** — `npm run lint` + `npm run format:check`
2. **Typecheck & Test** — `npm run type-check` (`vue-tsc --build`) +
   `npm run test:coverage`
3. **CodeQL Security Scan**
4. **Read-only Rootfs Smoke Test** — builds the image once, pushes it under a
   `-test` tag, runs the container under the production restrictions
   (read-only root file system, no capabilities, `no-new-privileges`), checks
   that the runtime `config.js` is generated and that unsafe `API_BASE_URL` /
   `APP_ENVIRONMENT` values are refused
5. **Build & Push Image** — only on `push`/`workflow_dispatch` started on
   `main` (never on PRs, other branches or the scheduled run), promotes the
   tested image by digest to
   `ghcr.io/kirchenmusik-st-augustin/osa-frontend:latest` and
   `:${{ github.sha }}`; nothing is rebuilt

A pushed image reaches a running stage on its own, via
`podman-auto-update.timer` — or immediately, via `--tags deploy-frontend`.
See [Day-2 deploy](https://github.com/Kirchenmusik-St-Augustin/osa-deploy/blob/main/README.md#52-day-2-deploy) in the `osa-deploy` README for that full
deploy flow; this repo doesn't run it.
