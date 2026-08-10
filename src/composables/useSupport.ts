import api from '@/services/api'
import type { PerformanceShortBase } from '@/composables/useBookings'

// UI-independent API layer for Schritt 7's Selfadmin-Support (5a "Meine
// Anfragen und Buchungen", 5b "Meine Ansprechpersonen") -- mirrors
// useProfile.ts's shape. PerformanceShortBase is the exact wire shape of the
// backend's PerformanceShortOutput (see app/schemas/booking.py).

export interface ContactUser {
  id: number
  givenname: string
  surname: string
  has_email: boolean
}

export interface RoleWithContacts {
  id: number
  name: string
  label: string
  description: string | null
  users: ContactUser[]
}

export function useSupport() {
  async function getMyRequestsAndBookings(): Promise<PerformanceShortBase[]> {
    const response = await api.get<PerformanceShortBase[]>('/support/requests-and-bookings')
    return response.data
  }

  async function getContactpersons(): Promise<RoleWithContacts[]> {
    const response = await api.get<RoleWithContacts[]>('/support/contactpersons')
    return response.data
  }

  // Always resolves 200 -- the backend silently no-ops for a missing/
  // unverified recipient (1:1 Legacy quirk, see support_service.
  // send_message_to_contactperson's docstring), the caller never learns
  // whether a real send happened.
  async function sendMessageToContactperson(recipientId: number, message: string): Promise<void> {
    await api.post('/support/message-to-contactperson', {
      recipient_id: recipientId,
      message,
    })
  }

  return { getMyRequestsAndBookings, getContactpersons, sendMessageToContactperson }
}
