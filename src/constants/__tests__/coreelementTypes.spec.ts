import { describe, expect, it } from 'vitest'
import { COREELEMENT_TYPES, findCoreelementTypeMeta } from '../coreelementTypes'

describe('coreelementTypes', () => {
  it('has exactly the six Legacy Coreelement types', () => {
    expect(COREELEMENT_TYPES.map((meta) => meta.type)).toEqual([
      'instrument',
      'voice',
      'choirjob',
      'propriumelement',
      'location',
      'role',
    ])
  })

  it('finds the metadata for a known type', () => {
    expect(findCoreelementTypeMeta('role')).toEqual({
      type: 'role',
      label: 'Rollen',
      permission: 'roleMaintain',
    })
  })

  it('returns undefined for an unknown type', () => {
    expect(findCoreelementTypeMeta('bogus')).toBeUndefined()
  })
})
