import Swal from 'sweetalert2'

// 1:1 port of Legacy's helper.js customConfirm/customToast (SweetAlert2) --
// used app-wide for destructive-action confirmation and success/error
// feedback, not just by the Coreelement admin pages, so this lives in
// services/ rather than being scoped to one view.
export async function confirmAction(
  message = 'Soll diese Aktion wirklich ausgeführt werden',
): Promise<boolean> {
  const result = await Swal.fire({
    text: message,
    showDenyButton: true,
    confirmButtonText: '&nbsp;&nbsp;Ja&nbsp;&nbsp;&nbsp;',
    denyButtonText: 'Nein',
    allowEnterKey: false,
    denyButtonColor: 'darkgray',
    confirmButtonColor: 'salmon',
    customClass: {
      denyButton: 'order-1',
      confirmButton: 'order-2',
    },
  })
  return result.isConfirmed
}

export function showToast(message: string, isError = false): void {
  void Swal.fire({
    icon: isError ? 'error' : 'success',
    title: message,
    toast: true,
    position: 'bottom-start',
    color: 'white',
    background: isError ? 'red' : 'green',
    iconColor: 'white',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
  })
}
