<script setup lang="ts">
// New admin-only overview of the backend's currently registered scheduled
// jobs (no Legacy equivalent -- ported from the vb-fastapi-vue sister
// project's Scheduler view). Live snapshot only: no persisted run history,
// no trigger buttons (out of scope for this feature).
import { onMounted, ref } from 'vue'
import { useScheduler, type ScheduledJob } from '@/composables/useScheduler'
import { extractApiErrors } from '@/services/apiErrors'
import { showToast } from '@/services/notifications'

const { listScheduledJobs } = useScheduler()

const jobs = ref<ScheduledJob[]>([])

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
</script>

<template>
  <h2 class="h2 text-center mb-4">Scheduler</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-sm-10">
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
