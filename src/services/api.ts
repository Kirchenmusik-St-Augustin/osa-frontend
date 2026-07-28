import axios from 'axios'
import { apiBaseUrl } from '@/runtimeConfig'

// Central Axios client -- all API calls MUST go through this instance, never
// a scattered fetch()/axios call, so the base URL stays swappable via
// runtimeConfig.ts (CLAUDE.md: "API-Basis-URL konfigurierbar, nie hart
// codiert"). Auth-token attachment / 401-refresh interceptors are added in
// the Auth slice -- this scaffolding step only proves the wiring exists.
const api = axios.create({
  baseURL: apiBaseUrl(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

export default api
