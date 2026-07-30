import api from '@/services/api'

export interface PerformanceLocation {
  id: number
  name: string
  color: string
  address: string | null
}

export interface PerformancePropriumItem {
  propriumelement_id: number
  propriumelement_name: string
  propriumwork_id: number
  propriumwork_name: string
  artist_name: string
  description: string | null
  demanding: boolean
}

export interface PerformanceRehearsal {
  schedule: string
  comment: string | null
}

export interface PositionEntry {
  id: number
  name: string
  quantity: number
}

export interface PerformanceSetup {
  instruments: PositionEntry[]
  voices: PositionEntry[]
  choirjobs: PositionEntry[]
}

export interface PerformanceCalendarItem {
  id: number
  schedule: string
  location: PerformanceLocation
  ordinariumwork_id: number
  ordinariumwork_name: string
  ordinariumwork_artist_name: string
  ordinariumwork_demanding: boolean
  artist_name: string | null
  proprium: PerformancePropriumItem[]
  demanding_proprium: boolean
  rehearsals: PerformanceRehearsal[]
}

export interface PerformanceShow {
  id: number
  schedule: string
  location: PerformanceLocation
  ordinariumwork_id: number
  ordinariumwork_name: string
  ordinariumwork_artist_name: string
  ordinariumwork_artist_description: string | null
  ordinariumwork_description: string | null
  ordinariumwork_demanding: boolean
  artist_id: number | null
  artist_name: string | null
  artist_description: string | null
  description: string | null
  rehearsals: PerformanceRehearsal[]
  setup: PerformanceSetup
  proprium: PerformancePropriumItem[]
  demanding_proprium: boolean
}

export interface PerformanceFormData {
  id: number
  schedule: string
  location_id: number
  ordinariumwork_id: number
  ordinariumwork_label: string
  artist_id: number | null
  description: string | null
  choirjob_defaultfee: number
  instrument_defaultfee: number
  voice_defaultfee: number
  extracost_amount: number | null
  extracost_description: string | null
  setup: PerformanceSetup
  proprium: PerformancePropriumItem[]
  rehearsals: PerformanceRehearsal[]
  deletable: boolean
}

export interface AvailablePosition {
  id: number
  name: string
}

export interface PerformanceAvailableData {
  conductors: AvailablePosition[]
  instruments: AvailablePosition[]
  voices: AvailablePosition[]
  choirjobs: AvailablePosition[]
  locations: PerformanceLocation[]
  propriumelements: AvailablePosition[]
}

export interface PositionInput {
  id: number
  quantity: number
}

export interface PerformanceSetupInput {
  instruments: PositionInput[]
  voices: PositionInput[]
  choirjobs: PositionInput[]
}

export interface PerformancePropriumEntryInput {
  propriumelement_id: number
  propriumwork_id: number
}

export interface PerformanceRehearsalInput {
  schedule: string
  comment: string | null
}

export interface PerformancePayload {
  schedule: string
  location_id: number
  ordinariumwork_id: number
  artist_id: number | null
  description: string | null
  choirjob_defaultfee: number
  instrument_defaultfee: number
  voice_defaultfee: number
  extracost_amount: number | null
  extracost_description: string | null
  setup: PerformanceSetupInput
  proprium: PerformancePropriumEntryInput[]
  rehearsals: PerformanceRehearsalInput[]
}

export interface PerformanceResponse {
  id: number
  schedule: string
  location_id: number
  ordinariumwork_id: number
  artist_id: number | null
  description: string | null
  choirjob_defaultfee: number
  instrument_defaultfee: number
  voice_defaultfee: number
  extracost_amount: number | null
  extracost_description: string | null
}

// UI-independent API layer for the Performance domain, Schritt 5 --
// mirrors useOrdinariumworks.ts/useArtists.ts's shape. Deliberately has no
// Booking/Cast/Billing calls (that's Schritt 6, a separate composable).
export function usePerformances() {
  async function listForMonth(year: number, month: number): Promise<PerformanceCalendarItem[]> {
    const response = await api.get<PerformanceCalendarItem[]>('/performances', {
      params: { year, month },
    })
    return response.data
  }

  async function getAvailableData(): Promise<PerformanceAvailableData> {
    const response = await api.get<PerformanceAvailableData>('/performances/available')
    return response.data
  }

  async function getDetail(id: number): Promise<PerformanceShow> {
    const response = await api.get<PerformanceShow>(`/performances/${id}`)
    return response.data
  }

  async function getFormData(id: number): Promise<PerformanceFormData> {
    const response = await api.get<PerformanceFormData>(`/performances/${id}/form`)
    return response.data
  }

  async function create(payload: PerformancePayload): Promise<PerformanceResponse> {
    const response = await api.post<PerformanceResponse>('/performances', payload)
    return response.data
  }

  async function update(id: number, payload: PerformancePayload): Promise<PerformanceResponse> {
    const response = await api.put<PerformanceResponse>(`/performances/${id}`, payload)
    return response.data
  }

  async function remove(id: number): Promise<void> {
    await api.delete(`/performances/${id}`)
  }

  return { listForMonth, getAvailableData, getDetail, getFormData, create, update, remove }
}
