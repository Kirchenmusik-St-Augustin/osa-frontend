<script setup lang="ts">
import { computed, onMounted, reactive, ref, useTemplateRef, watch } from 'vue'
import { Modal } from 'bootstrap'
import FormCheckbox from '@/components/common/FormCheckbox.vue'
import FormInput from '@/components/common/FormInput.vue'
import { useCoreelements, type Coreelement } from '@/composables/useCoreelements'
import { findCoreelementTypeMeta, type CoreelementType } from '@/constants/coreelementTypes'
import { extractApiErrors } from '@/services/apiErrors'
import { confirmAction, showToast } from '@/services/notifications'

// Only these three CoreelementTypes carry the osa-only `active` flag
// (outside the structural 1:1 transfer's scope) -- they're the ones referenced
// via the position_type/position_id pattern (bookings/booking_logs/
// performance_positions/ordinariumwork_positions/user_positions), where
// "no longer offered for a NEW assignment, but never deletable either"
// actually applies. Location/Role/Propriumelement don't have it.
const ACTIVE_FLAG_TYPES: readonly CoreelementType[] = ['instrument', 'voice', 'choirjob']

// Generic replacement for Legacy's six near-identical Instrument/Voice/
// Choirjob/Location/Role/Propriumelement admin pages -- Legacy itself
// already renders all six through a single `type`-prop-driven
// Coreelement/Index.vue, this is the same idea ported to Vue3 (Schritt 3).
const props = defineProps<{ type: CoreelementType }>()

const typeMeta = computed(() => findCoreelementTypeMeta(props.type))
const title = computed(() => typeMeta.value?.label ?? props.type)
const hasActiveFlag = computed(() => ACTIVE_FLAG_TYPES.includes(props.type))

const { items, fetchList, save, remove, move } = useCoreelements(() => props.type)

const editForm = reactive({
  name: '',
  label: '',
  description: '',
  address: '',
  color: '',
  active: true,
})
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

// Vue Router reuses this exact component instance when navigating between
// two `administrator-coreelement` routes (only the `:type` param changes,
// e.g. via the Administrator navbar dropdown) -- onMounted() above only
// fires once, so without this watcher the list would silently keep
// showing the PREVIOUS type's rows after such a navigation.
watch(
  () => props.type,
  () => {
    modalInstance?.hide()
    editingId.value = null
    resetForm()
    void fetchList()
  },
)

function resetForm(): void {
  editForm.name = ''
  editForm.label = ''
  editForm.description = ''
  editForm.address = ''
  editForm.color = ''
  editForm.active = true
  fieldErrors.value = {}
}

function openCreateModal(): void {
  editingId.value = null
  resetForm()
  modalInstance?.show()
}

function openEditModal(element: Coreelement): void {
  editingId.value = element.id
  editForm.name = element.name
  editForm.label = element.label ?? ''
  editForm.description = element.description ?? ''
  editForm.address = element.address ?? ''
  editForm.color = element.color ?? ''
  editForm.active = element.active ?? true
  fieldErrors.value = {}
  modalInstance?.show()
}

function closeModal(): void {
  modalInstance?.hide()
  resetForm()
}

// Only send the fields that are actually relevant for this type -- the
// backend's CoreelementRequest treats an unexpected non-null field as a
// validation error ("für diesen Typ nicht zulässig"), mirroring Legacy's
// per-type SaveRequest classes.
function buildPayload(): {
  name: string
  label?: string
  description?: string
  address?: string
  color?: string
  active?: boolean
} {
  const payload: {
    name: string
    label?: string
    description?: string
    address?: string
    color?: string
    active?: boolean
  } = { name: editForm.name }
  if (props.type === 'role') {
    payload.label = editForm.label
    payload.description = editForm.description
  }
  if (props.type === 'location') {
    payload.address = editForm.address
    payload.color = editForm.color
  }
  if (hasActiveFlag.value) {
    payload.active = editForm.active
  }
  return payload
}

async function submitForm(): Promise<void> {
  submitting.value = true
  fieldErrors.value = {}
  try {
    await save(editingId.value, buildPayload())
    showToast('Element gespeichert')
    closeModal()
  } catch (error) {
    fieldErrors.value = extractApiErrors(error).fieldErrors
  } finally {
    submitting.value = false
  }
}

async function deleteItem(element: Coreelement): Promise<void> {
  const confirmed = await confirmAction('Soll das Element wirklich gelöscht werden?')
  if (!confirmed) return

  try {
    await remove(element.id)
    showToast('Element gelöscht')
  } catch (error) {
    const { fieldErrors: fe } = extractApiErrors(error)
    showToast(fe['general'] ?? 'Ein unerwarteter Fehler ist aufgetreten.', true)
  }
}

async function moveItem(id: number, direction: 'up' | 'down'): Promise<void> {
  try {
    await move(id, direction)
  } catch {
    showToast('Ein unerwarteter Fehler ist aufgetreten.', true)
  }
}
</script>

<template>
  <h2 class="h2 text-center mb-4">{{ title }}</h2>

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
            id="coreelement-name"
            v-model="editForm.name"
            title="Name"
            required
            :error="fieldErrors['name']"
          />
          <FormInput
            v-if="type === 'role'"
            id="coreelement-label"
            v-model="editForm.label"
            title="Anzeigename"
            required
            :error="fieldErrors['label']"
          />
          <FormInput
            v-if="type === 'role'"
            id="coreelement-description"
            v-model="editForm.description"
            title="Beschreibung"
            required
            type="textarea"
            :error="fieldErrors['description']"
          />
          <FormInput
            v-if="type === 'location'"
            id="coreelement-address"
            v-model="editForm.address"
            title="Adresse"
            required
            type="textarea"
            :error="fieldErrors['address']"
          />
          <FormInput
            v-if="type === 'location'"
            id="coreelement-color"
            v-model="editForm.color"
            title="Farbe"
            required
            :error="fieldErrors['color']"
          />
          <FormCheckbox
            v-if="hasActiveFlag"
            id="coreelement-active"
            v-model="editForm.active"
            title="Aktiv"
            as-switch
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
        <div v-for="(element, index) in items" :key="element.id" class="list-group-item">
          <div class="row">
            <div
              class="col-sm-7 text-start text-nowrap"
              :class="{ 'text-muted': element.active === false }"
            >
              {{ element.name }}
              <span v-if="element.active === false" class="badge text-bg-secondary ms-1"
                >archiviert</span
              >
            </div>
            <div class="col-sm-5 text-end text-nowrap">
              <button
                type="button"
                class="btn btn-secondary btn-sm ms-2"
                title="nach unten bewegen"
                :disabled="index >= items.length - 1"
                @click="moveItem(element.id, 'down')"
              >
                <i class="fa-fw fas fa-arrow-down"></i>
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm ms-2"
                title="nach oben bewegen"
                :disabled="index === 0"
                @click="moveItem(element.id, 'up')"
              >
                <i class="fa-fw fas fa-arrow-up"></i>
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm ms-2"
                title="bearbeiten"
                @click="openEditModal(element)"
              >
                <i class="fa-fw fas fa-edit"></i>
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm ms-2"
                title="löschen"
                @click="deleteItem(element)"
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
