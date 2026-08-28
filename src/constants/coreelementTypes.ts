// Legacy already treats Instrument/Voice/Choirjob/Location/Role/
// Propriumelement as ONE generic "Coreelement" pool (six identical
// controllers rendering a single `type`-prop-driven Vue page, Schritt 3)
// -- this registry is the frontend's single source of truth for that pool,
// mirroring the backend's COREELEMENT_CONFIG/`_PERMISSION_BY_TYPE` (app/services/
// coreelement_service.py, app/api/router_includes/coreelement.py).
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

// Order matches Legacy's "Administrator" navbar dropdown exactly
// (AuthLeftMenu.vue), labels match Legacy's helper.js getLabel().
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
