import { describe, expect, it } from 'vitest'
import { COREELEMENT_TYPES, findCoreelementTypeMeta } from '../coreelementTypes'

describe('coreelementTypes', () => {
  // The permission strings feed both the navbar visibility and the router's
  // coreelement guard, and must match the backend's permission names
  // exactly -- a typo in any single row would silently hide a menu entry or
  // lock out a legitimate role, so every row is pinned, not just the type.
  it('has exactly the six Legacy Coreelement types, each with its label and permission name', () => {
    expect(COREELEMENT_TYPES).toEqual([
      { type: 'instrument', label: 'Instrumente', permission: 'instrumentMaintain' },
      { type: 'voice', label: 'Stimmen', permission: 'voiceMaintain' },
      { type: 'choirjob', label: 'Choraufgaben', permission: 'choirjobMaintain' },
      {
        type: 'propriumelement',
        label: 'Proprium-Elemente',
        permission: 'propriumelementMaintain',
      },
      { type: 'location', label: 'Orte', permission: 'locationMaintain' },
      { type: 'role', label: 'Rollen', permission: 'roleMaintain' },
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
