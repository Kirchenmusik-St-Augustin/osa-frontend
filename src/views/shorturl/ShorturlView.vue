<script setup lang="ts">
import { onMounted, reactive, ref, useTemplateRef } from 'vue'
import { Modal } from 'bootstrap'
import FormInput from '@/components/common/FormInput.vue'
import { useShorturls, type Shorturl } from '@/composables/useShorturls'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'
import { formatUtcDateTime } from '@/services/dateFormat'

// Deliberately its own small modal-edit page, 1:1 CoreelementView.vue's/
// FeeView.vue's pattern of shared building blocks (FormInput,
// notifications.ts, bootstrap Modal) -- but the markup below mirrors
// Legacy's OWN `Content/Shorturl/Index.vue` template exactly (bare
// clickable icons instead of icon buttons, no row/col grid wrapper around
// the table, `.modal-lg`), not FeeView.vue's markup, since Legacy's
// Shorturl page and Fee page differ from each other in these details too.
const { items, urlprefix, fetchList, save, remove } = useShorturls()

const editForm = reactive({ path: '', target: '' })
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
  editForm.path = ''
  editForm.target = ''
  fieldErrors.value = {}
}

function openCreateModal(): void {
  editingId.value = null
  resetForm()
  modalInstance?.show()
}

function openEditModal(shorturl: Shorturl): void {
  editingId.value = shorturl.id
  editForm.path = shorturl.path
  editForm.target = shorturl.target
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
    await save(editingId.value, { path: editForm.path, target: editForm.target })
    showToast('Element gespeichert')
    closeModal()
  } catch (error) {
    fieldErrors.value = extractApiErrors(error).fieldErrors
  } finally {
    submitting.value = false
  }
}

async function deleteItem(shorturl: Shorturl): Promise<void> {
  const confirmed = await confirmAction('Soll das Element wirklich gelöscht werden?')
  if (!confirmed) return

  try {
    await remove(shorturl.id)
    showToast('Element gelöscht')
  } catch (error) {
    const { fieldErrors: fe } = extractApiErrors(error)
    showToast(fe['general'] ?? 'Ein unerwarteter Fehler ist aufgetreten.', true)
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Kurz-URLs</h2>

  <div
    id="editModal"
    ref="editModal"
    class="modal fade"
    tabindex="-1"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Bearbeiten</h5>
        </div>
        <div class="modal-body">
          <FormInput
            id="shorturl-path"
            v-model="editForm.path"
            title="Pfad"
            required
            :error="fieldErrors['path']"
          />
          <FormInput
            id="shorturl-target"
            v-model="editForm.target"
            title="Ziel"
            required
            :error="fieldErrors['target']"
          />
          <div v-if="editForm.path.length" class="mt-2 overflow-x-hidden">
            <span class="text-muted">{{ urlprefix }}</span>
            <span class="fw-bold">{{ editForm.path }}</span>
          </div>
          <div v-else class="mt-2">&nbsp;</div>
          <div v-if="editForm.target.length" class="overflow-x-hidden">
            <span class="me-2 h3 fw-bold">&rdca;</span>
            <span>{{ editForm.target }}</span>
          </div>
          <div v-else>
            <span class="h3">&nbsp;</span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">Schließen</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="submitting || !editForm.path || !editForm.target"
            @click="submitForm"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="items.length" class="table-responsive">
    <table class="table table-striped table-sm table-bordered">
      <thead>
        <tr>
          <th class="text-start">Aktion</th>
          <th class="text-start">Weiterleitung</th>
          <th class="text-end">Counter</th>
          <th class="text-end">Letzter Aufruf</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td class="text-start text-nowrap" width="1">
            <i
              class="fas fa-fw fa-edit mx-1 c-pointer"
              title="bearbeiten"
              @click="openEditModal(item)"
            ></i>
            <i
              class="fas fa-fw fa-trash-alt mx-1 c-pointer"
              title="löschen"
              @click="deleteItem(item)"
            ></i>
          </td>
          <td class="text-start text-nowrap">
            <a class="text-decoration-none" :href="urlprefix + item.path" target="_blank">
              <span class="text-muted">{{ urlprefix }}</span>
              <span class="fw-bold">{{ item.path }}</span>
            </a>
            <div>
              <span class="me-2 h3 fw-bold">&rdca;</span>
              <a class="text-decoration-none" :href="item.target" target="_blank">{{
                item.target
              }}</a>
            </div>
          </td>
          <td class="text-end text-nowrap">{{ item.counter }}</td>
          <td class="text-end text-nowrap">
            <span v-if="item.latestcall_at">{{ formatUtcDateTime(item.latestcall_at) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="text-center">
    <button type="button" class="btn btn-secondary my-3" @click="openCreateModal">anlegen</button>
  </div>
</template>
