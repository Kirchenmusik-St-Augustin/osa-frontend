# osa-frontend

Vue 3 SPA frontend for **OSA** ("Orchester-Einteilung") — the scheduling/
casting system for the church musicians of Kirchenmusik St. Augustin.
Talks to [`osa-backend`](https://github.com/Kirchenmusik-St-Augustin/osa-backend); migrates a legacy Laravel/
Inertia/Vue application.

## Tech Stack

- **Framework:** Vue 3 (`<script setup>`, strict TypeScript), Vite, Pinia,
  Vue Router
- **UI:** Bootstrap 5, FontAwesome, SweetAlert2, flatpickr
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
the bundle). `src/runtimeConfig.ts` is what actually reads `window.config`
at app startup. The script fails loudly (non-zero exit, clear stderr
message) if `API_BASE_URL` or `APP_ENVIRONMENT` is missing — the container
refuses to start nginx rather than silently serving a broken config.

This is what makes the SAME image deployable to dev, QA, and production
without a rebuild — only the container's env vars change.

## Development Setup

### Prerequisites

- Node.js (see `package.json`'s `engines.node`)
- Podman with the `osa-frontend` container running for the containerized
  dev workflow — see
  [`osa-deploy`'s README](https://github.com/Kirchenmusik-St-Augustin/osa-deploy#local-development-environment)
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
  the public browser bundle.
- **Non-`VITE_`** (`API_BASE_URL`, `APP_ENVIRONMENT`, `GOOGLE_CLIENT_ID`)
  — runtime-only, read by the running prod container, set via
  [`osa-deploy`](https://github.com/Kirchenmusik-St-Augustin/osa-deploy)'s `secrets/<stage>/osa-frontend.env.j2`,
  see its README's
  [Maintaining secrets](https://github.com/Kirchenmusik-St-Augustin/osa-deploy#maintaining-secrets)
  section.

`GOOGLE_CLIENT_ID` is optional on both sides (frontend and
[backend](https://github.com/Kirchenmusik-St-Augustin/osa-backend#environment-variables)) — leave it
empty/unset on a stage where Google's Developer Console isn't (or can't
be) configured, and the Google Sign-In button simply doesn't render on
that stage (`googleClientId()` in `src/runtimeConfig.ts`, checked by
`LoginView.vue`'s `v-if`). No separate feature-flag variable needed; the
client ID itself is the switch.

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
4. **Build & Push Image** — only on `push`/`workflow_dispatch` (never on
   PRs or the scheduled run), pushes
   `ghcr.io/kirchenmusik-st-augustin/osa-frontend:latest` and
   `:${{ github.sha }}`

A pushed image reaches a running stage on its own, via
`podman-auto-update.timer` — or immediately, via `--tags deploy-frontend`.
See [`osa-deploy`'s README](https://github.com/Kirchenmusik-St-Augustin/osa-deploy) for that full deploy
flow; this repo doesn't run it.

---

# Deutsch

Vue-3-SPA-Frontend für **OSA** ("Orchester-Einteilung") — das
Dienstplan-/Besetzungssystem für die Kirchenmusiker von Kirchenmusik
St. Augustin. Spricht mit [`osa-backend`](https://github.com/Kirchenmusik-St-Augustin/osa-backend); migriert eine
bestehende Laravel/Inertia/Vue-Anwendung.

## Tech-Stack

- **Framework:** Vue 3 (`<script setup>`, striktes TypeScript), Vite,
  Pinia, Vue Router
- **UI:** Bootstrap 5, FontAwesome, SweetAlert2, flatpickr
- **Auslieferung in Prod:** nginx (statischer Build), Podman Quadlets
  (rootless systemd) — die Quadlets für jede Stage, inklusive lokaler
  Entwicklung, liegen in [`osa-deploy`](https://github.com/Kirchenmusik-St-Augustin/osa-deploy)

## Runtime-Konfigurationsmodell

Der einzige wirklich erklärungsbedürftige Mechanismus in diesem Repo:
**Vites `VITE_*`-Env-Vars werden zur Build-Zeit fest ins JS-Bundle
gebacken** — ein Docker-Image wäre sonst für immer an eine
Backend-URL/Umgebung gebunden. Stattdessen liefert das Prod-Image einen
Platzhalter `public/config.template.js` aus, der vom Build unverändert
nach `dist/` kopiert wird, und der Container schreibt daraus über sein
eigenes `docker/docker-entrypoint.d/40-generate-runtime-config.sh` **beim
Containerstart** eine echte `config.js` — aus den tatsächlichen
Runtime-Env-Vars (`API_BASE_URL`, `APP_ENVIRONMENT`, optional
`GOOGLE_CLIENT_ID` — ohne `VITE_`-Präfix, diese werden vom laufenden
Container gelesen, nicht ins Bundle gebacken). `src/runtimeConfig.ts`
liest beim App-Start tatsächlich `window.config`. Das Skript schlägt laut
fehl (Exit-Code ungleich Null, klare Fehlermeldung auf stderr), wenn
`API_BASE_URL` oder `APP_ENVIRONMENT` fehlt — der Container verweigert
dann den nginx-Start, statt still eine kaputte Konfiguration
auszuliefern.

Genau das macht dasselbe Image für Dev, QA und Produktion einsetzbar,
ohne Neubau — nur die Env-Vars des Containers ändern sich.

## Entwicklungs-Setup

### Voraussetzungen

- Node.js (siehe `package.json`s `engines.node`)
- Podman mit laufendem `osa-frontend`-Container für den containerisierten
  Dev-Workflow — wie das von einem frischen Checkout aus aufgesetzt wird,
  steht in
  [`osa-deploy`s README](https://github.com/Kirchenmusik-St-Augustin/osa-deploy#lokale-entwicklungsumgebung)
  (die Quadlet-Konfiguration landet dabei unter
  `~/.config/containers/systemd/osa/osa-frontend/` auf der Dev-Umgebung)

### Nach dem Klonen

```bash
npm install
pre-commit install
```

Ohne `pre-commit install` umgehen Commits eslint/prettier/vue-tsc
komplett — die CI-Pipeline führt exakt dieselben Prüfungen aus.

```bash
npm run dev
```

### Tests ausführen

```bash
podman exec osa-frontend npx vitest run
podman exec osa-frontend npx vitest run --coverage
```

> Vitest überspringt den Coverage-Report still, wenn irgendein Test
> fehlschlägt — ein grüner `--coverage`-Lauf ohne ausgegebenen Report
> bedeutet meist, dass weiter oben tatsächlich ein Test fehlgeschlagen
> ist; lieber hochscrollen, statt einem leeren Coverage-Abschnitt zu
> vertrauen.

### Linting, Formatierung & Typprüfung

```bash
podman exec osa-frontend npx eslint . --max-warnings 0
podman exec osa-frontend npx eslint . --fix

podman exec osa-frontend npx prettier --check --experimental-cli src/
podman exec osa-frontend npx prettier --write --experimental-cli src/

podman exec osa-frontend npx vue-tsc --build
```

## Umgebungsvariablen

```bash
cp .env.example .env
```

Zwei getrennte Mechanismen, nicht zu verwechseln (siehe
[Runtime-Konfigurationsmodell](#runtime-konfigurationsmodell) oben):

- **`VITE_*`** (`.env`, diese Datei) — nur Build-/Dev-Zeit, genutzt von
  `npm run dev`/`npm run build`. Niemals Secrets hier eintragen — sie
  landen im öffentlichen Browser-Bundle.
- **Ohne `VITE_`-Präfix** (`API_BASE_URL`, `APP_ENVIRONMENT`,
  `GOOGLE_CLIENT_ID`) — nur zur Laufzeit, gelesen vom laufenden
  Prod-Container, gesetzt über [`osa-deploy`](https://github.com/Kirchenmusik-St-Augustin/osa-deploy)s
  `secrets/<stage>/osa-frontend.env.j2`, siehe den Abschnitt
  [Secrets pflegen](https://github.com/Kirchenmusik-St-Augustin/osa-deploy#secrets-pflegen) in dessen
  README.

`GOOGLE_CLIENT_ID` ist auf beiden Seiten optional (Frontend und
[Backend](https://github.com/Kirchenmusik-St-Augustin/osa-backend#umgebungsvariablen)) — auf einer Stage,
auf der die Google Developer Console nicht (oder bewusst nicht)
konfiguriert ist, einfach leer/unset lassen, dann rendert der
Google-Sign-In-Button auf dieser Stage schlichtweg nicht
(`googleClientId()` in `src/runtimeConfig.ts`, geprüft von `LoginView.vue`s
`v-if`). Keine eigene Feature-Flag-Variable nötig — die Client-ID selbst
ist der Schalter.

## Branching

- `main` — geschützt, nur per PR mergen
- `development` — aktiver Entwicklungsbranch

## CI/CD

Die Pipeline (`.github/workflows/ci-cd.yml`) läuft bei jedem Push auf
`main`, jedem PR gegen `main`, wöchentlich (Montag 06:00 UTC,
CodeQL-Refresh) und bei manuellem Dispatch:

1. **Lint & Format** — `npm run lint` + `npm run format:check`
2. **Typecheck & Test** — `npm run type-check` (`vue-tsc --build`) +
   `npm run test:coverage`
3. **CodeQL Security Scan**
4. **Build & Push Image** — nur bei `push`/`workflow_dispatch` (nie bei
   PRs oder dem geplanten Lauf), pusht
   `ghcr.io/kirchenmusik-st-augustin/osa-frontend:latest` und
   `:${{ github.sha }}`

Ein gepushtes Image erreicht eine laufende Stage von selbst, über
`podman-auto-update.timer` — oder sofort, über `--tags deploy-frontend`.
Den vollständigen Deploy-Flow dazu beschreibt
[`osa-deploy`s README](https://github.com/Kirchenmusik-St-Augustin/osa-deploy); dieses Repo führt ihn
nicht selbst aus.
