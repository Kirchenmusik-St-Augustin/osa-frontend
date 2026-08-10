import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSupport } from '../useSupport'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const samplePerformance = {
  id: 1,
  ordinariumwork_name: 'Krönungsmesse',
  ordinariumwork_artist_name: 'MOZART, Wolfgang',
  artist_name: null,
  schedule: '2099-01-01T12:00:00',
  location: { id: 1, name: 'Augustinerkirche', color: '336699', address: null },
  user_booking: { status: 1, position: null, at: null },
  proprium: [],
  demanding_proprium: false,
  rehearsals: [],
}

const sampleRole = {
  id: 1,
  name: 'planner',
  label: 'Planung',
  description: 'Plant den Dienstplan.',
  users: [{ id: 5, givenname: 'Franz', surname: 'HUBER', has_email: true }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSupport', () => {
  it('getMyRequestsAndBookings requests the support endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [samplePerformance] })
    const { getMyRequestsAndBookings } = useSupport()

    const performances = await getMyRequestsAndBookings()

    expect(mockedApi.get).toHaveBeenCalledWith('/support/requests-and-bookings')
    expect(performances).toEqual([samplePerformance])
  })

  it('getContactpersons requests the contactpersons endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [sampleRole] })
    const { getContactpersons } = useSupport()

    const roles = await getContactpersons()

    expect(mockedApi.get).toHaveBeenCalledWith('/support/contactpersons')
    expect(roles).toEqual([sampleRole])
  })

  it('sendMessageToContactperson POSTs recipient_id and message', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 'ok', message: 'Nachricht wurde versendet.' },
    })
    const { sendMessageToContactperson } = useSupport()

    await sendMessageToContactperson(5, 'Bitte um Rückruf.')

    expect(mockedApi.post).toHaveBeenCalledWith('/support/message-to-contactperson', {
      recipient_id: 5,
      message: 'Bitte um Rückruf.',
    })
  })
})
