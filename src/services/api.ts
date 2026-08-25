import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { apiBaseUrl } from '@/runtimeConfig'
import { useAuthStore } from '@/stores/auth'
import { useLoadingStore } from '@/stores/loading'
import router from '@/router'

// Central Axios client -- all API calls MUST go through this instance, never
// a scattered fetch()/axios call, so the base URL stays swappable via
// runtimeConfig.ts (the API base URL must be configurable, never
// hardcoded).
const api = axios.create({
  baseURL: apiBaseUrl(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// Endpoints where a 401 means "wrong credentials"/"invalid or expired
// token", not "my session expired" -- must never trigger a refresh-and-
// retry loop (a bad password at /auth/login isn't fixed by refreshing).
const AUTH_ENDPOINTS_WITHOUT_REFRESH = [
  '/auth/login',
  '/auth/refresh',
  '/auth/register',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/google/callback',
  '/auth/google/link',
]

function isExemptFromRefresh(url: string | undefined): boolean {
  if (!url) return false
  return AUTH_ENDPOINTS_WITHOUT_REFRESH.some((path) => url.includes(path))
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// A 401 on some other in-flight request while a refresh is already under
// way must NOT trigger a second, concurrent /auth/refresh call -- the
// backend rotates the refresh secret on every use, so a second call would
// fail with "Token reuse detected" and needlessly log the user out.
// Concurrent 401s instead queue up and get replayed once the one refresh
// in flight completes.
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function onRefreshComplete(newToken: string): void {
  refreshSubscribers.forEach((subscriber) => subscriber(newToken))
  refreshSubscribers = []
}

function redirectToLoginIfNeeded(): void {
  if (router.currentRoute.value.name !== 'login') {
    router
      .push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
      .catch(() => {})
  }
}

function queueForRefresh(originalRequest: RetryableRequestConfig): Promise<unknown> {
  return new Promise((resolve) => {
    refreshSubscribers.push((newToken) => {
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      resolve(api(originalRequest))
    })
  })
}

async function refreshAndRetry(originalRequest: RetryableRequestConfig): Promise<unknown> {
  isRefreshing = true
  const authStore = useAuthStore()
  try {
    const newToken = await authStore.refreshToken()
    isRefreshing = false
    onRefreshComplete(newToken)
    originalRequest.headers.Authorization = `Bearer ${newToken}`
    return await api(originalRequest)
  } catch (refreshError) {
    isRefreshing = false
    refreshSubscribers = []
    authStore.clearAuth()
    redirectToLoginIfNeeded()
    throw refreshError
  }
}

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  useLoadingStore().startLoading()
  return config
})

api.interceptors.response.use(
  (response) => {
    useLoadingStore().stopLoading()
    return response
  },
  (error: AxiosError) => {
    // Stopped before any of the refresh-retry logic below: a queued/
    // retried request triggers its own start/stop pair through the normal
    // request cycle, so the bar must not stay visible for the duration of
    // that retry too.
    useLoadingStore().stopLoading()

    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isExemptFromRefresh(originalRequest.url)
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing) {
      return queueForRefresh(originalRequest)
    }
    return refreshAndRetry(originalRequest)
  },
)

export default api
