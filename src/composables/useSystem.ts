import api from '@/services/api'

export interface Environment {
  environment: string
}

// UI-independent API layer for the backend's own deployment-stage info,
// shown next to the frontend's own stage (runtimeConfig.ts's
// appEnvironment()) on the profile page -- a mismatch between the two is
// visible at a glance.
export function useSystem() {
  async function getEnvironment(): Promise<Environment> {
    const response = await api.get<Environment>('/system/environment')
    return response.data
  }

  return { getEnvironment }
}
