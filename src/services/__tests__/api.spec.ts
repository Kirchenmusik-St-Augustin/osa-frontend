import { describe, expect, it } from 'vitest'
import api from '../api'

describe('api client', () => {
  it('is configured with the default same-origin base URL', () => {
    expect(api.defaults.baseURL).toBe('/api')
  })

  it('sends credentials so same-origin auth cookies/headers are included', () => {
    expect(api.defaults.withCredentials).toBe(true)
  })
})
