import type { AxiosError } from 'axios'

export interface ApiFieldErrors {
  fieldErrors: Record<string, string>
  generalError: string | null
}

interface ValidationErrorItem {
  loc: (string | number)[]
  msg: string
}

interface ErrorDetailBody {
  detail?: string | ValidationErrorItem[]
}

function isValidationErrorItem(value: unknown): value is ValidationErrorItem {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return Array.isArray(candidate['loc']) && typeof candidate['msg'] === 'string'
}

// The message of a failed request that has no input to be shown under: a
// server error, a lost connection, or the server's catch-all `general`
// validation error. `null` when the errors already sit under their fields,
// so a form can show them there and raise a toast only when the user would
// otherwise see nothing.
export function unattachedErrorMessage(error: unknown): string | null {
  const { fieldErrors, generalError } = extractApiErrors(error)
  const { general, ...attached } = fieldErrors
  if (Object.keys(attached).length > 0) return null
  return general ?? generalError
}

// Maps FastAPI's two error-response shapes (see main.py's exception
// handlers) to something every Auth view can render the same way: a
// per-field message (shown under the matching input) or a single general
// message (login failures, throttling, IDOR-safe 404s, ...).
export function extractApiErrors(error: unknown): ApiFieldErrors {
  const axiosError = error as AxiosError<ErrorDetailBody>
  const detail = axiosError.response?.data?.detail

  if (typeof detail === 'string') {
    return { fieldErrors: {}, generalError: detail }
  }

  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string> = {}
    for (const item of detail) {
      if (!isValidationErrorItem(item)) continue
      const field = item.loc[item.loc.length - 1]
      if (typeof field === 'string') {
        fieldErrors[field] = item.msg
      }
    }
    return { fieldErrors, generalError: null }
  }

  return { fieldErrors: {}, generalError: 'Ein unerwarteter Fehler ist aufgetreten.' }
}
