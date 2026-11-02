import api from '@/services/api'

export interface JobRun {
  status: 'success' | 'failure'
  output: string | null
  started_at: string
  finished_at: string
}

export interface ScheduledJob {
  id: string
  name: string
  trigger: string
  next_run: string | null
  description: string | null
  last_run: JobRun | null
}

// Answer of both manual triggers: the job was handed to the worker, its
// outcome shows up as the `last_run` of the scheduled job with this id.
export interface JobQueued {
  job_id: string
  queued_at: string
}

// UI-independent API layer for the admin-only "Scheduler" overview
// (GET /administrator/scheduler/jobs) -- trigger/next_run are a live
// snapshot computed from the backend's cron catalog, last_run is the one
// persisted piece of state (the most recent completed run per job, if
// any) -- plus the manual Koofr-backup trigger (POST .../backup/trigger)
// and its non-production counterpart, the manual downsync trigger
// (POST .../downsync/trigger). Both only queue the job (202 Accepted).
export function useScheduler() {
  async function listScheduledJobs(): Promise<ScheduledJob[]> {
    const response = await api.get<ScheduledJob[]>('/administrator/scheduler/jobs')
    return response.data
  }

  async function triggerBackup(): Promise<JobQueued> {
    const response = await api.post<JobQueued>('/administrator/scheduler/backup/trigger')
    return response.data
  }

  async function triggerDownsync(): Promise<JobQueued> {
    const response = await api.post<JobQueued>('/administrator/scheduler/downsync/trigger')
    return response.data
  }

  return { listScheduledJobs, triggerBackup, triggerDownsync }
}
