import { beforeEach, describe, expect, it, vi } from 'vitest'
import Swal from 'sweetalert2'
import { confirmAction, showToast } from '../notifications'

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn() },
}))

const mockedSwal = vi.mocked(Swal)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('confirmAction', () => {
  it('resolves true when the user confirms', async () => {
    mockedSwal.fire.mockResolvedValueOnce({ isConfirmed: true } as never)

    const result = await confirmAction('Soll das Element wirklich gelöscht werden?')

    expect(result).toBe(true)
    expect(mockedSwal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Soll das Element wirklich gelöscht werden?',
        confirmButtonColor: 'salmon',
        denyButtonColor: 'darkgray',
      }),
    )
  })

  it('resolves false when the user denies', async () => {
    mockedSwal.fire.mockResolvedValueOnce({ isConfirmed: false } as never)

    const result = await confirmAction()

    expect(result).toBe(false)
  })
})

describe('showToast', () => {
  it('fires a green success toast by default', () => {
    showToast('Element gespeichert')

    expect(mockedSwal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'success',
        title: 'Element gespeichert',
        background: 'green',
        position: 'bottom-start',
      }),
    )
  })

  it('fires a red error toast when isError is true', () => {
    showToast('Ein unerwarteter Fehler ist aufgetreten.', true)

    expect(mockedSwal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'error', background: 'red' }),
    )
  })
})
