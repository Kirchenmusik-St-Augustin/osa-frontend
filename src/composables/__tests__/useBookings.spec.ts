import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBookings, nextActionFor, type CastSavePayload } from '../useBookings'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('nextActionFor', () => {
  it.each([
    [0, null],
    [1, 'request'],
    [2, 'cancel'],
    [3, 'cancel'],
    [4, 'cancel'],
    [5, 'cancel'],
  ] as const)('status %i maps to %s', (status, expected) => {
    expect(nextActionFor(status)).toBe(expected)
  })
})

describe('useBookings', () => {
  it('getCastPage requests the cast sub-resource', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { id: 1 } })
    const { getCastPage } = useBookings()

    await getCastPage(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/performances/1/cast')
  })

  it('saveCast posts the cast payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { cast: {}, not_booked: [] } })
    const payload: CastSavePayload = {
      cast: { instruments: [], voices: [], choirjobs: [] },
      not_booked: [],
    }
    const { saveCast } = useBookings()

    await saveCast(1, payload)

    expect(mockedApi.post).toHaveBeenCalledWith('/performances/1/cast', payload)
  })

  it('changeBookingStatus posts without a body', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { status: 2, position: null, at: null } })
    const { changeBookingStatus } = useBookings()

    const result = await changeBookingStatus(1)

    expect(mockedApi.post).toHaveBeenCalledWith('/performances/1/booking-status')
    expect(result.status).toBe(2)
  })

  it('getMyBookingStatus requests the my-booking-status sub-resource', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { status: 0, position: null, at: null } })
    const { getMyBookingStatus } = useBookings()

    await getMyBookingStatus(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/performances/1/my-booking-status')
  })

  it('getBilling requests the billing sub-resource', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { id: 1 } })
    const { getBilling } = useBookings()

    await getBilling(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/performances/1/billing')
  })

  it('getRequestsAndBookings requests the requests-and-bookings sub-resource', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { entries: [] } })
    const { getRequestsAndBookings } = useBookings()

    await getRequestsAndBookings(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/performances/1/requests-and-bookings')
  })

  it('getMessageToCastPage requests the message-to-cast sub-resource', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { booked_cast: {} } })
    const { getMessageToCastPage } = useBookings()

    await getMessageToCastPage(1)

    expect(mockedApi.get).toHaveBeenCalledWith('/performances/1/message-to-cast')
  })

  it('getMessageRecipients passes type/id as query params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const { getMessageRecipients } = useBookings()

    await getMessageRecipients(1, 'voices', 5)

    expect(mockedApi.get).toHaveBeenCalledWith('/performances/1/message-to-cast/recipients', {
      params: { type: 'voices', id: 5 },
    })
  })

  it('getMessageRecipients omits type/id when null (type=all)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const { getMessageRecipients } = useBookings()

    await getMessageRecipients(1, null, null)

    expect(mockedApi.get).toHaveBeenCalledWith('/performances/1/message-to-cast/recipients', {
      params: { type: undefined, id: undefined },
    })
  })

  it('sendMessageToCast posts recipient_ids and message', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { status: 'ok' } })
    const { sendMessageToCast } = useBookings()

    await sendMessageToCast(1, [2, 3], 'Hallo!')

    expect(mockedApi.post).toHaveBeenCalledWith('/performances/1/message-to-cast/send', {
      recipient_ids: [2, 3],
      message: 'Hallo!',
    })
  })
})
