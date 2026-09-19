// Instrument/Voice/Choirjob/Location/Role/Propriumelement form ONE generic
// "Coreelement" pool (a single `type`-prop-driven Vue page) -- this registry
// is the frontend's single source of truth for that pool, mirroring the
// backend's COREELEMENT_CONFIG/`_PERMISSION_BY_TYPE`
// (app/services/coreelement_service.py,
// app/api/router_includes/coreelement.py).
// Shared by the router (permission guard), AppNavbar (dropdown items +
// labels), and CoreelementView (page title).
export type CoreelementType =
  | 'instrument'
  | 'voice'
  | 'choirjob'
  | 'propriumelement'
  | 'location'
  | 'role'

export interface CoreelementTypeMeta {
  type: CoreelementType
  label: string
  permission: string
}

// Order matches the "Administrator" navbar dropdown.
export const COREELEMENT_TYPES: CoreelementTypeMeta[] = [
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
]

export function findCoreelementTypeMeta(type: string): CoreelementTypeMeta | undefined {
  return COREELEMENT_TYPES.find((meta) => meta.type === type)
}
