<script setup lang="ts">
// Admin-only overview of the backend's currently registered scheduled jobs
// (no Legacy equivalent -- ported from the vb-fastapi-vue sister project's
// Scheduler view). Live snapshot only: no persisted run history. Plus a
// manual Koofr-backup trigger, production-only in the UI (1:1 vb-intern's
// equivalent S3-backed button, adapted to Koofr) -- the backend endpoint
// itself stays callable in every stage (see useScheduler.ts/backend
// comments), the `schedulerView` permission is the real guard.
import { computed, onMounted, ref } from 'vue'
import { useScheduler, type ScheduledJob } from '@/composables/useScheduler'
import { appEnvironment } from '@/runtimeConfig'
import { extractApiErrors } from '@/services/apiErrors'
import { showToast } from '@/services/notifications'

const { listScheduledJobs, triggerBackup } = useScheduler()

const jobs = ref<ScheduledJob[]>([])
const backupSubmitting = ref(false)

const isProduction = computed(() => appEnvironment() === 'production')

onMounted(async () => {
  try {
    jobs.value = await listScheduledJobs()
  } catch (error) {
    showToast(
      extractApiErrors(error).generalError ?? 'Scheduler-Übersicht konnte nicht geladen werden.',
      true,
    )
  }
})

async function onTriggerBackup(): Promise<void> {
  backupSubmitting.value = true
  try {
    const result = await triggerBackup()
    showToast(`Backup erstellt: ${result.backup_name}`)
  } catch (error) {
    showToast(extractApiErrors(error).generalError ?? 'Backup konnte nicht erstellt werden.', true)
  } finally {
    backupSubmitting.value = false
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Scheduler</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-sm-10">
      <div v-if="isProduction" class="mb-4">
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
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
