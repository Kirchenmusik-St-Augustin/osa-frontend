import { describe, expect, it } from 'vitest'
import { extractApiErrors, unattachedErrorMessage } from '../apiErrors'

const validation = (loc: (string | number)[], msg: string) => ({
  response: { data: { detail: [{ loc, msg }] } },
})

describe('extractApiErrors', () => {
  it('maps a string detail to the general error', () => {
    expect(extractApiErrors({ response: { data: { detail: 'Gesperrt.' } } })).toEqual({
      fieldErrors: {},
      generalError: 'Gesperrt.',
    })
  })

  it('maps validation items to field errors by the last loc element', () => {
    expect(extractApiErrors(validation(['body', 'surname'], 'Zu kurz.'))).toEqual({
      fieldErrors: { surname: 'Zu kurz.' },
      generalError: null,
    })
  })

  it('ignores malformed validation items and numeric last loc elements', () => {
    const error = {
      response: {
        data: { detail: [null, { loc: 'x', msg: 1 }, { loc: ['body', 0], msg: 'Index.' }] },
      },
    }

    expect(extractApiErrors(error)).toEqual({ fieldErrors: {}, generalError: null })
  })

  it('falls back to the generic text for anything else', () => {
    expect(extractApiErrors(new Error('network')).generalError).toBe(
      'Ein unerwarteter Fehler ist aufgetreten.',
    )
  })
})

describe('unattachedErrorMessage', () => {
  it('returns null when the errors belong to fields', () => {
    expect(unattachedErrorMessage(validation(['body', 'name'], 'Vergeben.'))).toBeNull()
  })

  it('returns the message of a server error or lost connection', () => {
    expect(unattachedErrorMessage(new Error('network'))).toBe(
      'Ein unerwarteter Fehler ist aufgetreten.',
    )
    expect(unattachedErrorMessage({ response: { data: { detail: 'Gesperrt.' } } })).toBe(
      'Gesperrt.',
    )
  })

  it('returns the message of the catch-all general validation error', () => {
    expect(unattachedErrorMessage(validation(['body', 'general'], 'Nicht buchbar.'))).toBe(
      'Nicht buchbar.',
    )
  })

  it('keeps field errors under their fields even next to a general one', () => {
    const error = {
      response: {
        data: {
          detail: [
            { loc: ['body', 'name'], msg: 'Vergeben.' },
            { loc: ['body', 'general'], msg: 'Nicht buchbar.' },
          ],
        },
      },
    }

    expect(unattachedErrorMessage(error)).toBeNull()
  })
})
