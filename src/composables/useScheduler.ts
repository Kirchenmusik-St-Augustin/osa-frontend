import api from '@/services/api'

export interface ScheduledJob {
  id: string
  name: string
  trigger: string
  next_run: string | null
  description: string | null
}

export interface BackupTrigger {
  backup_name: string
  triggered_at: string
}

// UI-independent API layer for the admin-only "Scheduler" overview
// (GET /administrator/scheduler/jobs) -- a live snapshot of the backend's
// currently registered APScheduler jobs, no persisted run history -- plus
// the manual Koofr-backup trigger (POST .../backup/trigger).
export function useScheduler() {
  async function listScheduledJobs(): Promise<ScheduledJob[]> {
    const response = await api.get<ScheduledJob[]>('/administrator/scheduler/jobs')
    return response.data
  }

  async function triggerBackup(): Promise<BackupTrigger> {
    const response = await api.post<BackupTrigger>('/administrator/scheduler/backup/trigger')
    return response.data
  }

  return { listScheduledJobs, triggerBackup }
}
