import api from '@/services/api'
import type {
  BookingStatus,
  PerformanceLocation,
  PerformancePropriumItem,
  PerformanceRehearsal,
  PerformanceSetup,
  PositionRef,
} from '@/composables/usePerformances'

export type { BookingStatus, PositionRef }

// Field names are snake_case throughout (matching the backend's
// app/schemas/booking.py 1:1) -- unlike usePerformances.ts, there is no
// Legacy camelCase wire format to stay compatible with here, both sides of
// this API are built from scratch in Schritt 6 (see project_osa_migration_plan
// memory, Schritt 6 plan A.3/B.1).

export interface CastMember {
  id: number
  name: string
  fee: number
  // Only ever populated for choirjobs cast members (auto-sort-by-voice
  // feature) -- instruments/voices members keep both undefined/null.
  voice_name?: string | null
  voice_order?: number | null
}

export interface CastSetupItem {
  id: number
  name: string
  cast: CastMember[]
}

export interface CastSection {
  instruments: CastSetupItem[]
  voices: CastSetupItem[]
  choirjobs: CastSetupItem[]
}

export interface NotBookedEntry {
  id: number
  name: string
}

export interface CastFormData {
  cast: CastSection
  not_booked: NotBookedEntry[]
}

export interface BookableUser {
  id: number
  name: string
  // Only ever populated for choirjobs candidates -- see CastMember.
  voice_name?: string | null
  voice_order?: number | null
}

export interface BookableGroup {
  requesting: BookableUser[]
  other: BookableUser[]
}

export interface StaffItem {
  id: number
  name: string
  bookable: BookableGroup
}

export interface StaffSection {
  instruments: StaffItem[]
  voices: StaffItem[]
  choirjobs: StaffItem[]
}

export interface PopularFrequentUser {
  id: number
  name: string
  total: number
}

export interface PopularRecentUser {
  id: number
  name: string
  booked: string
}

export interface PopularItem {
  frequent: PopularFrequentUser[]
  recent: PopularRecentUser[]
}

// JSON serializes the backend's dict[int, PopularItemOutput] keys as
// strings -- the Instrument/Voice/Choirjob id is still the intended key,
// just accessed as `popular.instruments[String(instrumentId)]`.
export interface PopularSection {
  instruments: Record<string, PopularItem>
  voices: Record<string, PopularItem>
  choirjobs: Record<string, PopularItem>
}

export interface Fee {
  id: number
  name: string
  amount: number
}

// Exported (not just an internal extends-base) because Schritt 7's
// useSupport.ts needs the exact same shape 1:1 for /support/requests-and-
// bookings -- backend names it PerformanceShortOutput, kept as
// PerformanceShortBase here to avoid a churny rename of this file's other
// PerformanceShortBase-derived types.
export interface PerformanceShortBase {
  id: number
  ordinariumwork_name: string
  ordinariumwork_artist_name: string
  artist_name: string | null
  schedule: string
  location: PerformanceLocation
  user_booking: BookingStatus
  proprium: PerformancePropriumItem[]
  demanding_proprium: boolean
  rehearsals: PerformanceRehearsal[]
}

export interface PerformanceCastPage {
  id: number
  ordinariumwork_name: string
  ordinariumwork_artist_name: string
  artist_name: string | null
  schedule: string
  rehearsals: PerformanceRehearsal[]
  location: PerformanceLocation
  demanding_proprium: boolean
  setup: PerformanceSetup
  staff: StaffSection
  form_data: CastFormData
  fees: Fee[]
  popular: PopularSection
}

export interface CastMemberInput {
  id: number
  fee: number
}

export interface CastSetupItemInput {
  id: number
  cast: CastMemberInput[]
}

export interface CastSectionInput {
  instruments: CastSetupItemInput[]
  voices: CastSetupItemInput[]
  choirjobs: CastSetupItemInput[]
}

export interface CastSavePayload {
  cast: CastSectionInput
  not_booked: { id: number }[]
}

export interface BillingPosition {
  id: number | null
  name: string
  fee: number
}

export interface BillingItem {
  id: number
  name: string
  quantity: number
  positions: BillingPosition[]
  sum: number
}

export interface BillingType {
  items: BillingItem[]
  sum: number
  count: number
}

export interface BillingOrgfee {
  instruments: number
  choirjobs: number
  sum: number
}

export interface BillingExtracost {
  amount: number
  description: string
}

export interface Billing {
  instruments: BillingType
  voices: BillingType
  choirjobs: BillingType
  orgfee: BillingOrgfee
  extracost: BillingExtracost
  sum: number
}

export interface PerformanceBilling extends PerformanceShortBase {
  billing: Billing
}

export interface RequestOrBookingEntry {
  id: number
  name: string
  status: BookingStatus
}

export interface PerformanceRequestsAndBookings extends PerformanceShortBase {
  entries: RequestOrBookingEntry[]
}

export interface PerformanceMessageToCast extends PerformanceShortBase {
  booked_cast: CastSection
}

export interface MessageRecipient {
  id: number
  surname: string
  givenname: string
  has_email: boolean
  email: string | null
  phone: string | null
}

// Reflects the ACTUAL business rule, not just the UI label: what does
// clicking the self-service trigger for this status accomplish. Pure and
// isolated from the API call itself -- the endpoint takes no body, the
// server recomputes the real transition (see booking_service.
// change_user_request_status's docstring for why).
export function nextActionFor(status: number): 'request' | 'cancel' | null {
  if (status === 1) return 'request'
  if (status >= 2 && status <= 5) return 'cancel'
  return null
}

// UI-independent API layer for the Booking/Casting domain (Schritt 6) --
// mirrors usePerformances.ts's shape, kept as its OWN composable per that
// file's own "separate composable" note.
export function useBookings() {
  async function getCastPage(performanceId: number): Promise<PerformanceCastPage> {
    const response = await api.get<PerformanceCastPage>(`/performances/${performanceId}/cast`)
    return response.data
  }

  async function saveCast(performanceId: number, payload: CastSavePayload): Promise<CastFormData> {
    const response = await api.post<CastFormData>(`/performances/${performanceId}/cast`, payload)
    return response.data
  }

  // No status parameter -- the server computes the user's current status
  // and dispatches the transition itself.
  async function changeBookingStatus(performanceId: number): Promise<BookingStatus> {
    const response = await api.post<BookingStatus>(`/performances/${performanceId}/booking-status`)
    return response.data
  }

  async function getMyBookingStatus(performanceId: number): Promise<BookingStatus> {
    const response = await api.get<BookingStatus>(
      `/performances/${performanceId}/my-booking-status`,
    )
    return response.data
  }

  async function getBilling(performanceId: number): Promise<PerformanceBilling> {
    const response = await api.get<PerformanceBilling>(`/performances/${performanceId}/billing`)
    return response.data
  }

  async function getRequestsAndBookings(
    performanceId: number,
  ): Promise<PerformanceRequestsAndBookings> {
    const response = await api.get<PerformanceRequestsAndBookings>(
      `/performances/${performanceId}/requests-and-bookings`,
    )
    return response.data
  }

  async function getMessageToCastPage(performanceId: number): Promise<PerformanceMessageToCast> {
    const response = await api.get<PerformanceMessageToCast>(
      `/performances/${performanceId}/message-to-cast`,
    )
    return response.data
  }

  async function getMessageRecipients(
    performanceId: number,
    type: string | null,
    id: number | null,
  ): Promise<MessageRecipient[]> {
    const response = await api.get<MessageRecipient[]>(
      `/performances/${performanceId}/message-to-cast/recipients`,
      { params: { type: type ?? undefined, id: id ?? undefined } },
    )
    return response.data
  }

  async function sendMessageToCast(
    performanceId: number,
    recipientIds: number[],
    message: string,
  ): Promise<void> {
    await api.post(`/performances/${performanceId}/message-to-cast/send`, {
      recipient_ids: recipientIds,
      message,
    })
  }

  return {
    getCastPage,
    saveCast,
    changeBookingStatus,
    getMyBookingStatus,
    getBilling,
    getRequestsAndBookings,
    getMessageToCastPage,
    getMessageRecipients,
    sendMessageToCast,
  }
}
