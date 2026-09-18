<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/common/AppModal.vue'
import FormInput from '@/components/common/FormInput.vue'
import { useFees, type Fee } from '@/composables/useFees'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'

// Deliberately its own small modal-edit page (fees are administered through
// their own dedicated service, not the generic Coreelement mechanism -- see
// app/db/models/fee.py's docstring). Kept as a standalone copy of
// CoreelementView.vue's pattern rather than forcing Fee into
// COREELEMENT_CONFIG, which has no `order` column to move. Lives under
// views/system/ (not views/administrator/), matching the role-'disponent'
// gate (feeMaintain) rather than the Coreelement types' administrator-Flag
// gate.
const { items, fetchList, save, remove } = useFees()

const editForm = reactive({ name: '', amount: 0 })
const editingId = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})
const submitting = ref(false)

const modalOpen = ref(false)

onMounted(fetchList)

// The sort starts on name/ascending, so the FIRST click on "Name" flips to
// descending, not a no-op. Clicking the currently-inactive column switches
// to it and resets to ascending. Always sorting (rather than trusting
// whatever order `items` arrives in) is simpler: the backend already
// returns fees pre-ordered by name (see fee_service.list_fees's docstring),
// so the initial state matches.
type SortColumn = 'name' | 'amount'
const sortColumn = ref<SortColumn>('name')
const sortDirection = ref<'asc' | 'desc'>('asc')

function toggleSort(column: SortColumn): void {
  if (column === sortColumn.value) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

const sortedItems = computed(() => {
  const factor = sortDirection.value === 'asc' ? 1 : -1
  return [...items.value].sort((a, b) => {
    const left = sortColumn.value === 'name' ? a.name.toLowerCase() : a.amount
    const right = sortColumn.value === 'name' ? b.name.toLowerCase() : b.amount
    if (left < right) return -1 * factor
    if (left > right) return 1 * factor
    return 0
  })
})

function resetForm(): void {
  editForm.name = ''
  editForm.amount = 0
  fieldErrors.value = {}
}

function openCreateModal(): void {
  editingId.value = null
  resetForm()
  modalOpen.value = true
}

function openEditModal(fee: Fee): void {
  editingId.value = fee.id
  editForm.name = fee.name
  editForm.amount = fee.amount
  fieldErrors.value = {}
  modalOpen.value = true
}

function closeModal(): void {
  modalOpen.value = false
  resetForm()
}

async function submitForm(): Promise<void> {
  submitting.value = true
  fieldErrors.value = {}
  try {
    await save(editingId.value, { name: editForm.name, amount: editForm.amount })
    showToast('Tarif gespeichert')
    closeModal()
  } catch (error) {
    fieldErrors.value = extractApiErrors(error).fieldErrors
  } finally {
    submitting.value = false
  }
}

async function deleteItem(fee: Fee): Promise<void> {
  const confirmed = await confirmAction('Soll das Element wirklich gelöscht werden?')
  if (!confirmed) return

  try {
    await remove(fee.id)
    showToast('Element gelöscht')
  } catch (error) {
    const { fieldErrors: fe } = extractApiErrors(error)
    showToast(fe['general'] ?? 'Ein unerwarteter Fehler ist aufgetreten.', true)
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Tarife verwalten</h2>

  <AppModal v-model="modalOpen" :dismissible="false">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Bearbeiten</h5>
      </div>
      <div class="modal-body">
        <FormInput
          id="fee-name"
          v-model="editForm.name"
          title="Name"
          required
          :error="fieldErrors['name']"
        />
        <FormInput
          id="fee-amount"
          v-model="editForm.amount"
          title="Betrag"
          type="number"
          :min="0"
          :max="999"
          required
          :error="fieldErrors['amount']"
        />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="closeModal">Schließen</button>
        <button type="button" class="btn btn-primary" :disabled="submitting" @click="submitForm">
          Speichern
        </button>
      </div>
    </div>
  </AppModal>

  <div class="text-center">
    <button type="button" class="btn btn-secondary my-3" @click="openCreateModal">anlegen</button>
  </div>
  <div class="row justify-content-center my-3">
    <div class="col-md-7">
      <div class="table-responsive">
        <table class="table table-striped table-sm">
          <thead>
            <tr>
              <th class="c-pointer text-nowrap" @click="toggleSort('name')">
                <span class="me-1">Name</span>
                <span v-if="sortColumn === 'name'">
                  <i v-if="sortDirection === 'desc'" class="fas fa-caret-down"></i>
                  <i v-else class="fas fa-caret-up"></i>
                </span>
              </th>
              <th class="text-end pe-3 c-pointer text-nowrap" @click="toggleSort('amount')">
                <span v-if="sortColumn === 'amount'">
                  <i v-if="sortDirection === 'desc'" class="fas fa-caret-down"></i>
                  <i v-else class="fas fa-caret-up"></i>
                </span>
                <span class="ms-1">Betrag</span>
              </th>
              <th>&nbsp;</th>
              <th>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fee in sortedItems" :key="fee.id">
              <td>{{ fee.name }}</td>
              <td class="text-end pe-3 fw-bold">{{ fee.amount }}</td>
              <td class="text-end">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  title="bearbeiten"
                  @click="openEditModal(fee)"
                >
                  <i class="fa-fw fas fa-edit"></i>
                </button>
              </td>
              <td class="text-end">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  title="löschen"
                  @click="deleteItem(fee)"
                >
                  <i class="fa-fw fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
