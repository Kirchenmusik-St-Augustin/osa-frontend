<script setup lang="ts">
// Port of Legacy's Content/System/Userdirectory/Index.vue +
// Common/ListUsergroupComponent.vue (incl. its SelectorComponent/
// ClipboardComponent) -- the ability dropdown ("alle" or one specific
// Instrument/Voice/Choirjob), the "alle (N)" toggle-all switch, and the
// Nachname/Vorname/E-Mail/Telefon table (mailto/tel links, disabled
// switch for users without a verified email) are all real, visible
// Legacy UI and are ported 1:1 here -- same pattern already established
// in MessageToCastView.vue (Schritt 6).
//
// Deliberate exception (same reasoning as MessageToCastView.vue,
// User-confirmed 2026-07-31): Legacy's own "Nachricht verfassen" compose
// modal has NO trigger anywhere in its markup and posts to a route that
// never processes message/recipients -- genuinely dead, unreachable code,
// not ported. Only the functional "Mailing-Liste in Zwischenablage
// kopieren" part of ListUsergroupComponent is real.
import { computed, onMounted, ref, watch } from 'vue'
import {
  useUserdirectory,
  type DirectoryAbilities,
  type DirectoryEntry,
  type DirectoryPositionType,
} from '@/composables/useUserdirectory'
import { showToast } from '@/services/notifications'

const { getAbilities, listUsers } = useUserdirectory()

const abilities = ref<DirectoryAbilities | null>(null)
const users = ref<DirectoryEntry[]>([])
const selectedUserIds = ref<number[]>([])
const checkAllStatus = ref(false)
// Legacy's SelectorComponent.vue defaults to 'all' with an `immediate:
// true` watcher, fetching the full list right on mount -- no manual
// selection required (1:1 the same default already established in
// MessageToCastView.vue's ability dropdown).
const selectedAbility = ref('all')

const POSITION_TYPES: readonly DirectoryPositionType[] = ['instruments', 'voices', 'choirjobs']
const POSITION_LABELS: Record<DirectoryPositionType, string> = {
  instruments: 'Instrumente',
  voices: 'Stimmen',
  choirjobs: 'Choraufgaben',
}

async function loadUsers(): Promise<void> {
  selectedUserIds.value = []
  checkAllStatus.value = false
  if (selectedAbility.value === 'none') {
    users.value = []
    return
  }
  if (selectedAbility.value === 'all') {
    users.value = await listUsers('all', null)
    return
  }
  const [type, idText] = selectedAbility.value.split('@') as [DirectoryPositionType, string]
  users.value = await listUsers(type, Number(idText))
}

onMounted(async () => {
  abilities.value = await getAbilities()
})

// immediate: true -- 1:1 Legacy's SelectorComponent.vue watcher, which
// fires right on mount against the 'all' default (see selectedAbility's
// docstring above).
watch(selectedAbility, loadUsers, { immediate: true })

const eligibleCount = computed(() => users.value.filter((user) => user.has_email).length)

function toggleCheckAll(): void {
  selectedUserIds.value = checkAllStatus.value
    ? users.value.filter((user) => user.has_email).map((user) => user.id)
    : []
}

function toggleUser(id: number): void {
  selectedUserIds.value = selectedUserIds.value.includes(id)
    ? selectedUserIds.value.filter((candidateId) => candidateId !== id)
    : [...selectedUserIds.value, id]
}

function copySelected(): void {
  const emails = users.value
    .filter((user) => selectedUserIds.value.includes(user.id) && user.email)
    .map((user) => user.email)
    .join(', ')
  void navigator.clipboard.writeText(emails)
  showToast('Mailing-Liste in Zwischenablage kopiert.')
}
</script>

<template>
  <h2 class="h2 text-center mb-4">Benutzerverzeichnis</h2>

  <div v-if="abilities" class="row justify-content-center mt-4">
    <div class="col-md-9">
      <div
        class="text-center mb-3 c-pointer"
        :class="{ invisible: !selectedUserIds.length }"
        @click="copySelected"
      >
        Mailing-Liste in Zwischenablage kopieren
      </div>

      <div class="row justify-content-center">
        <div class="col-md-8">
          <select id="userdirectory-ability" v-model="selectedAbility" class="form-select">
            <option value="none">&nbsp;</option>
            <option value="all">alle</option>
            <optgroup v-for="type in POSITION_TYPES" :key="type" :label="POSITION_LABELS[type]">
              <option
                v-for="item in abilities[type]"
                :key="`${type}-${item.id}`"
                :value="`${type}@${item.id}`"
              >
                {{ item.name }}
              </option>
            </optgroup>
          </select>
        </div>
      </div>

      <div v-if="users.length" class="mt-4">
        <div class="form-check form-switch mb-4">
          <input
            id="userdirectory-check-all"
            v-model="checkAllStatus"
            class="form-check-input"
            type="checkbox"
            role="switch"
            @change="toggleCheckAll"
          />
          <label class="form-check-label" for="userdirectory-check-all">
            <strong class="ps-3">alle ({{ eligibleCount }})</strong>
          </label>
        </div>

        <div class="table-responsive">
          <table class="table table-striped table-sm mx-auto w-100">
            <thead>
              <tr>
                <th scope="col">&nbsp;</th>
                <th scope="col">Nachname</th>
                <th scope="col">Vorname</th>
                <th scope="col">E-Mail</th>
                <th scope="col">Telefon</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <div class="form-check form-switch">
                    <input
                      v-if="user.has_email"
                      class="form-check-input"
                      type="checkbox"
                      role="switch"
                      :checked="selectedUserIds.includes(user.id)"
                      @change="toggleUser(user.id)"
                    />
                    <input v-else class="form-check-input" type="checkbox" role="switch" disabled />
                  </div>
                </td>
                <td>{{ user.surname }}</td>
                <td>{{ user.givenname }}</td>
                <td>
                  <a
                    v-if="user.email"
                    class="text-decoration-none"
                    :href="`mailto:${user.email}`"
                    >{{ user.email }}</a
                  >
                </td>
                <td>
                  <a v-if="user.phone" class="text-decoration-none" :href="`tel:${user.phone}`">{{
                    user.phone
                  }}</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        class="text-center my-3 c-pointer"
        :class="{ invisible: !selectedUserIds.length }"
        @click="copySelected"
      >
        Mailing-Liste in Zwischenablage kopieren
      </div>
    </div>
  </div>
</template>
