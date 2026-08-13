import api from '@/services/api'

export interface ScheduledJob {
  id: string
  name: string
  trigger: string
  next_run: string | null
  description: string | null
}

// UI-independent API layer for the admin-only "Scheduler" overview
// (GET /administrator/scheduler/jobs) -- a live snapshot of the backend's
// currently registered APScheduler jobs, no persisted run history.
export function useScheduler() {
  async function listScheduledJobs(): Promise<ScheduledJob[]> {
    const response = await api.get<ScheduledJob[]>('/administrator/scheduler/jobs')
    return response.data
  }

  return { listScheduledJobs }
}
