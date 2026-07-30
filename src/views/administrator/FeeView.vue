<script setup lang="ts">
import { onMounted, reactive, ref, useTemplateRef } from 'vue'
import { Modal } from 'bootstrap'
import FormInput from '@/components/common/FormInput.vue'
import { useFees, type Fee } from '@/composables/useFees'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'

// Deliberately its own small modal-edit page (Legacy's Fee/Index.vue is its
// own dedicated controller, not part of the generic Coreelement mechanism --
// see app/db/models/fee.py's docstring). Kept as a standalone copy of
// CoreelementView.vue's pattern rather than forcing Fee into
// COREELEMENT_CONFIG, which has no `order` column to move (see
// project_osa_migration_plan memory, Schritt 6 plan B.3).
const { items, fetchList, save, remove } = useFees()

const editForm = reactive({ name: '', amount: 0 })
const editingId = ref<number | null>(null)
const fieldErrors = ref<Record<string, string>>({})
const submitting = ref(false)

const modalElement = useTemplateRef<HTMLDivElement>('editModal')
let modalInstance: Modal | null = null

onMounted(async () => {
  if (modalElement.value) {
    modalInstance = new Modal(modalElement.value, { backdrop: 'static', keyboard: false })
  }
  await fetchList()
})

function resetForm(): void {
  editForm.name = ''
  editForm.amount = 0
  fieldErrors.value = {}
}

function openCreateModal(): void {
  editingId.value = null
  resetForm()
  modalInstance?.show()
}

function openEditModal(fee: Fee): void {
  editingId.value = fee.id
  editForm.name = fee.name
  editForm.amount = fee.amount
  fieldErrors.value = {}
  modalInstance?.show()
}

function closeModal(): void {
  modalInstance?.hide()
  resetForm()
}

async function submitForm(): Promise<void> {
  submitting.value = true
  fieldErrors.value = {}
  try {
    await save(editingId.value, { name: editForm.name, amount: editForm.amount })
    showToast('Honorar gespeichert')
    closeModal()
  } catch (error) {
    fieldErrors.value = extractApiErrors(error).fieldErrors
  } finally {
    submitting.value = false
  }
}

async function deleteItem(fee: Fee): Promise<void> {
  const confirmed = await confirmAction('Soll dieses Honorar wirklich gelöscht werden?')
  if (!confirmed) return

  try {
    await remove(fee.id)
    showToast('Honorar gelöscht')
  } catch (error) {
    const { fieldErrors: fe } = extractApiErrors(error)
    showToast(fe['general'] ?? 'Ein unerwarteter Fehler ist aufgetreten.', true)
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Honorare</h2>

  <div
    id="editModal"
    ref="editModal"
    class="modal fade"
    tabindex="-1"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
  >
    <div class="modal-dialog">
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
    </div>
  </div>

  <div class="row justify-content-center my-2">
    <div class="col-md-6">
      <div class="text-center">
        <button type="button" class="btn btn-secondary my-3" @click="openCreateModal">
          anlegen
        </button>
      </div>
      <div class="list-group">
        <div v-for="fee in items" :key="fee.id" class="list-group-item">
          <div class="row">
            <div class="col-sm-7 text-start text-nowrap">{{ fee.name }} ({{ fee.amount }},-)</div>
            <div class="col-sm-5 text-end text-nowrap">
              <button
                type="button"
                class="btn btn-secondary btn-sm ms-2"
                title="bearbeiten"
                @click="openEditModal(fee)"
              >
                <i class="fa-fw fas fa-edit"></i>
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm ms-2"
                title="löschen"
                @click="deleteItem(fee)"
              >
                <i class="fa-fw fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
