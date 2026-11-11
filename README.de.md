# osa-frontend

[English](README.md)

Vue-3-SPA-Frontend für **OSA** ("Orchester-Einteilung") — das
Dienstplan-/Besetzungssystem für die Kirchenmusiker von Kirchenmusik
St. Augustin. Spricht mit [`osa-backend`](https://github.com/Kirchenmusik-St-Augustin/osa-backend).

## Tech-Stack

- **Framework:** Vue 3 (`<script setup>`, striktes TypeScript), Vite,
  Pinia, Vue Router
- **UI:** Bootstrap 5 (styles only), FontAwesome, flatpickr
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
liest beim App-Start tatsächlich `window.__APP_CONFIG__`. Das Skript
schlägt laut fehl (Exit-Code ungleich Null, klare Fehlermeldung auf
stderr), wenn `API_BASE_URL` oder `APP_ENVIRONMENT` fehlt oder unsicher
ist (`API_BASE_URL` muss mit `/` oder `https://` beginnen,
`APP_ENVIRONMENT` einer von `development`, `test`, `qa`, `production`
sein). Der Container verweigert dann den nginx-Start, statt still eine
kaputte Konfiguration auszuliefern.

Genau das macht dasselbe Image für Dev, QA und Produktion einsetzbar,
ohne Neubau — nur die Env-Vars des Containers ändern sich.

## Entwicklungs-Setup

### Voraussetzungen

- Node.js (siehe `package.json`s `engines.node`)
- Podman mit laufendem `osa-frontend`-Container für den containerisierten
  Dev-Workflow — wie das von einem frischen Checkout aus aufgesetzt wird,
  steht in
  [`osa-deploy`s README](https://github.com/Kirchenmusik-St-Augustin/osa-deploy/blob/main/README.de.md#6-lokale-entwicklung)
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
  landen im öffentlichen Browser-Bundle. `VITE_DEV_ALLOWED_HOSTS` nennt,
  kommagetrennt, die Hostnamen, auf die der Dev-Server neben localhost
  antwortet (die öffentliche Dev-Domain hinter dem Reverse-Proxy); ohne den
  Wert verweigert Vite diese Domain.
- **Ohne `VITE_`-Präfix** (`API_BASE_URL`, `APP_ENVIRONMENT`,
  `GOOGLE_CLIENT_ID`) — nur zur Laufzeit, gelesen vom laufenden
  Prod-Container, gesetzt über die vault-verschlüsselte Datei
  `sites/<stage>/secrets/osa-frontend.env.j2` im privaten Site-Repository
  `osa-access`, siehe [Secrets](https://github.com/Kirchenmusik-St-Augustin/osa-deploy/blob/main/README.de.md#71-secrets) in der `osa-deploy`-README.

`GOOGLE_CLIENT_ID` ist auf beiden Seiten optional (Frontend und
[Backend](https://github.com/Kirchenmusik-St-Augustin/osa-backend/blob/main/README.de.md#umgebungsvariablen)) — auf einer Stage,
auf der die Google Developer Console nicht (oder bewusst nicht)
konfiguriert ist, einfach leer/unset lassen, dann rendert der
Google-Sign-In-Button auf dieser Stage schlichtweg nicht
(`googleClientId()` in `src/runtimeConfig.ts`, geprüft von `LoginView.vue`s
`v-if`). Keine eigene Feature-Flag-Variable nötig — die Client-ID selbst
ist der Schalter.

## Sicherheitslücke melden

Bitte kein öffentliches Issue für ein Sicherheitsproblem eröffnen, sondern
es privat melden:

- über die private Schwachstellenmeldung von GitHub: Reiter "Security and
  quality" dieses Repositorys, dann "Report a vulnerability", oder
- per E-Mail an einteilung@hochamt.at.

Bitte die betroffene Version oder den Commit, die Schritte zur
Reproduktion und die erwartete Auswirkung angeben. Wir antworten so
schnell wie möglich und halten dich über die Behebung auf dem Laufenden.

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
4. **Read-only Rootfs Smoke Test** — baut das Image einmal, pusht es unter
   einem `-test`-Tag, startet den Container unter den Produktionsauflagen
   (schreibgeschütztes Root-Dateisystem, keine Capabilities,
   `no-new-privileges`), prüft, dass die Laufzeit-`config.js` erzeugt wird und
   dass unsichere Werte für `API_BASE_URL` / `APP_ENVIRONMENT` abgelehnt werden
5. **Build & Push Image** — nur bei `push`/`workflow_dispatch`, die auf
   `main` gestartet wurden (nie bei PRs, anderen Branches oder dem
   geplanten Lauf), befördert das getestete Image per Digest nach
   `ghcr.io/kirchenmusik-st-augustin/osa-frontend:latest` und
   `:${{ github.sha }}`; es wird nichts neu gebaut

Ein gepushtes Image erreicht eine laufende Stage von selbst, über
`podman-auto-update.timer` — oder sofort, über `--tags deploy-frontend`.
Den vollständigen Deploy-Flow dazu beschreibt
[Deploy im Tagesbetrieb](https://github.com/Kirchenmusik-St-Augustin/osa-deploy/blob/main/README.de.md#52-deploy-im-tagesbetrieb) in der
`osa-deploy`-README; dieses Repo führt ihn nicht selbst aus.
