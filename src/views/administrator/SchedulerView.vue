<script setup lang="ts">
// Admin-only overview of the backend's currently registered scheduled jobs.
// Trigger/next_run are a live snapshot computed from the backend's cron
// catalog; last_run is the one persisted piece of state -- the most
// recently completed run of each job, if any. Plus a manual Koofr-backup
// trigger, production-only in the UI -- the backend endpoint itself stays
// callable in every stage (see useScheduler.ts/backend comments), the
// `schedulerTrigger` permission is the real guard and the only one that
// shows the trigger buttons. The downsync button is its
// mirror image: only outside production, where the backend enforces the
// same boundary as a real 409 (not just UI convenience -- see the backend
// router's docstring). Both triggers only queue the job for the worker; the
// outcome appears as the job's last run, so the list is reloaded after a
// short delay.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useScheduler, type JobRun, type ScheduledJob } from '@/composables/useScheduler'
import { appEnvironment } from '@/runtimeConfig'
import { extractApiErrors } from '@/services/apiErrors'
import { formatUtcDateTime } from '@/services/dateFormat'
import { confirmAction, showToast } from '@/services/notifications'
import { useAuthStore } from '@/stores/auth'

// Gives the worker time to pick up a queued job before the list is read again.
const REFRESH_DELAY_MS = 5000

// Plain lookup table, not a computed() -- there is nothing reactive to
// derive here, just a static status->class mapping indexed per job card
// in the v-for below (a single top-level computed() can't vary per loop
// item). Same Record-lookup style as BookingStatusBadge.vue's
// BADGE_BY_STATUS.
const lastRunBadgeClassByStatus: Record<JobRun['status'], string> = {
  success: 'text-bg-success',
  failure: 'text-bg-danger',
}

const { listScheduledJobs, triggerBackup, triggerDownsync } = useScheduler()
const authStore = useAuthStore()

const jobs = ref<ScheduledJob[]>([])
const backupSubmitting = ref(false)
const downsyncSubmitting = ref(false)

const isProduction = computed(() => appEnvironment() === 'production')
const canTrigger = computed(() => authStore.hasPermission('schedulerTrigger'))

let refreshTimer: ReturnType<typeof setTimeout> | undefined

async function loadJobs(): Promise<void> {
  try {
    jobs.value = await listScheduledJobs()
  } catch (error) {
    showToast(
      extractApiErrors(error).generalError ?? 'Scheduler-Übersicht konnte nicht geladen werden.',
      true,
    )
  }
}

onMounted(loadJobs)
onBeforeUnmount(() => clearTimeout(refreshTimer))

async function onTriggerBackup(): Promise<void> {
  backupSubmitting.value = true
  try {
    await triggerBackup()
  } catch (error) {
    showToast(extractApiErrors(error).generalError ?? 'Backup konnte nicht erstellt werden.', true)
    return
  } finally {
    backupSubmitting.value = false
  }

  showToast(
    'Backup wurde gestartet. Das Ergebnis steht unter „Letzter Lauf“ der Task backup_koofr.',
  )
  await loadJobs()
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => void loadJobs(), REFRESH_DELAY_MS)
}

async function onTriggerDownsync(): Promise<void> {
  const confirmed = await confirmAction(
    'Downsync ersetzt die lokale Datenbank dieser Stage mit dem aktuellen ' +
      'Produktivstand. Danach musst du dich neu anmelden. Fortfahren?',
  )
  if (!confirmed) return

  downsyncSubmitting.value = true
  try {
    await triggerDownsync()
  } catch (error) {
    showToast(
      extractApiErrors(error).generalError ?? 'Downsync konnte nicht durchgeführt werden.',
      true,
    )
    return
  } finally {
    downsyncSubmitting.value = false
  }

  // The restore replaces the session tables too, so this session ends on its
  // own once the worker is done; the list is not reloaded here, the next
  // request after the restore leads to the sign-in page.
  showToast(
    'Downsync wurde gestartet. Das Ergebnis steht unter „Letzter Lauf“ der Task downsync. ' +
      'Danach musst du dich neu anmelden.',
  )
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Scheduler</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-sm-10">
      <div v-if="canTrigger && isProduction" class="mb-4">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="backupSubmitting"
          @click="onTriggerBackup"
        >
          Backup jetzt erstellen
        </button>
        <p class="text-muted small mt-2 mb-0">
          Dieser Button steht nur in der Production-Stage zur Verfügung.
        </p>
        <p class="text-muted small mb-0">
          Erstellt sofort ein zusätzliches Backup der Produktivdaten nach Koofr – unabhängig vom
          täglichen automatischen Backup.
        </p>
      </div>
      <div v-else-if="canTrigger" class="mb-4">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="downsyncSubmitting"
          @click="onTriggerDownsync"
        >
          Downsync jetzt durchführen
        </button>
        <p class="text-muted small mt-2 mb-0">
          Dieser Button steht nur außerhalb der Production-Stage zur Verfügung.
        </p>
        <p class="text-muted small mb-0">
          Ersetzt die lokale Datenbank dieser Stage sofort durch das letzte Production-Backup –
          unabhängig vom nächtlichen automatischen Downsync. Danach musst du dich neu anmelden.
        </p>
      </div>

      <div v-if="jobs.length === 0" class="text-center">
        Aktuell sind keine Scheduled Tasks registriert.
      </div>
      <div v-else class="row row-cols-1 row-cols-md-2 g-3">
        <div v-for="job in jobs" :key="job.id" class="col">
          <div class="card h-100">
            <div class="card-body">
              <span class="badge text-bg-secondary font-monospace mb-2">{{ job.id }}</span>
              <p v-if="job.description" class="card-text">{{ job.description }}</p>
              <dl class="row mb-0 small">
                <dt class="col-5">Zeitplan</dt>
                <dd class="col-7">{{ job.trigger }}</dd>
                <dt class="col-5">Nächste Ausführung</dt>
                <dd class="col-7">{{ job.next_run ?? '–' }}</dd>
                <dt class="col-5">Letzter Lauf</dt>
                <dd class="col-7">
                  <span
                    v-if="job.last_run"
                    class="badge"
                    :class="lastRunBadgeClassByStatus[job.last_run.status]"
                    :title="job.last_run.output ?? undefined"
                  >
                    {{ formatUtcDateTime(job.last_run.finished_at) }}
                  </span>
                  <span v-else>–</span>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
