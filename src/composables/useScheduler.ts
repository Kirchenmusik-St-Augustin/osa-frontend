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

export interface BackupTrigger {
  backup_name: string
  triggered_at: string
}

export interface DownsyncTrigger {
  restored_backup: string
  triggered_at: string
}

// UI-independent API layer for the admin-only "Scheduler" overview
// (GET /administrator/scheduler/jobs) -- trigger/next_run are a live
// snapshot computed from the backend's cron catalog, last_run is the one
// persisted piece of state (the most recent completed run per job, if
// any) -- plus the manual Koofr-backup trigger (POST .../backup/trigger)
// and its non-production counterpart, the manual downsync trigger
// (POST .../downsync/trigger).
export function useScheduler() {
  async function listScheduledJobs(): Promise<ScheduledJob[]> {
    const response = await api.get<ScheduledJob[]>('/administrator/scheduler/jobs')
    return response.data
  }

  async function triggerBackup(): Promise<BackupTrigger> {
    const response = await api.post<BackupTrigger>('/administrator/scheduler/backup/trigger')
    return response.data
  }

  async function triggerDownsync(): Promise<DownsyncTrigger> {
    const response = await api.post<DownsyncTrigger>('/administrator/scheduler/downsync/trigger')
    return response.data
  }

  return { listScheduledJobs, triggerBackup, triggerDownsync }
}
