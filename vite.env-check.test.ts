import { describe, expect, it } from 'vitest'
import { parseAllowedHosts, validateViteEnv } from './vite.env-check'

describe('validateViteEnv', () => {
  it('throws when VITE_APP_ENVIRONMENT is missing', () => {
    expect(() => validateViteEnv({})).toThrow('VITE_APP_ENVIRONMENT is not set')
  })

  it('throws when VITE_APP_ENVIRONMENT is invalid', () => {
    expect(() => validateViteEnv({ VITE_APP_ENVIRONMENT: 'staging' })).toThrow(
      "VITE_APP_ENVIRONMENT='staging' is invalid",
    )
  })

  it('does not throw for production without VITE_API_BASE_URL', () => {
    expect(() => validateViteEnv({ VITE_APP_ENVIRONMENT: 'production' })).not.toThrow()
  })

  it.each(['development', 'test', 'qa'])(
    'throws for %s without VITE_API_BASE_URL',
    (appEnvironment) => {
      expect(() => validateViteEnv({ VITE_APP_ENVIRONMENT: appEnvironment })).toThrow(
        'VITE_API_BASE_URL must be set',
      )
    },
  )

  it.each(['development', 'test', 'qa', 'production'])(
    'does not throw for %s with VITE_API_BASE_URL set',
    (appEnvironment) => {
      expect(() =>
        validateViteEnv({
          VITE_APP_ENVIRONMENT: appEnvironment,
          VITE_API_BASE_URL: 'https://example.test/api',
        }),
      ).not.toThrow()
    },
  )
})

describe('parseAllowedHosts', () => {
  it.each([undefined, '', '  ', ' , ,'])('returns no hosts for %j', (value) => {
    expect(parseAllowedHosts(value)).toEqual([])
  })

  it('returns a single host', () => {
    expect(parseAllowedHosts('dev.example.test')).toEqual(['dev.example.test'])
  })

  it('splits a comma-separated list, trims blanks and drops empty entries', () => {
    expect(parseAllowedHosts(' a.example.test, b.example.test ,, ')).toEqual([
      'a.example.test',
      'b.example.test',
    ])
  })
})
