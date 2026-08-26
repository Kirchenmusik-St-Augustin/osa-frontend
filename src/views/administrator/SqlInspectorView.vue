<script setup lang="ts">
// New admin-only, read-only DB table browser (no Legacy equivalent). Not
// a free-text SQL console: the only user-chosen input is a table name from
// a backend-provided list, validated again server-side against a live
// schema allowlist.
import { computed, onMounted, ref, watch } from 'vue'
import { useSqlInspector, type TableData } from '@/composables/useSqlInspector'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import { extractApiErrors } from '@/services/apiErrors'
import { showToast } from '@/services/notifications'

const PAGE_SIZE = 25

const { listTables, getTableData } = useSqlInspector()

const tables = ref<string[]>([])
const selectedTable = ref<string | null>(null)
const tableData = ref<TableData | null>(null)
const page = ref(1)

const totalPages = computed(() => {
  if (!tableData.value) return 0
  return Math.max(1, Math.ceil(tableData.value.total / tableData.value.page_size))
})
const canGoToPreviousPage = computed(() => page.value > 1)
const canGoToNextPage = computed(() => page.value < totalPages.value)

async function loadTableData(): Promise<void> {
  if (!selectedTable.value) return
  try {
    tableData.value = await getTableData(selectedTable.value, page.value, PAGE_SIZE)
  } catch (error) {
    showToast(
      extractApiErrors(error).generalError ?? 'Tabellendaten konnten nicht geladen werden.',
      true,
    )
  }
}

onMounted(async () => {
  try {
    tables.value = await listTables()
  } catch (error) {
    showToast(
      extractApiErrors(error).generalError ?? 'Tabellenliste konnte nicht geladen werden.',
      true,
    )
  }
})

watch(selectedTable, () => {
  page.value = 1
  tableData.value = null
  void loadTableData()
})

function goToPage(target: number): void {
  page.value = target
  void loadTableData()
}
</script>

<template>
  <h2 class="h2 text-center mb-4">SQL-Einsicht</h2>

  <div class="row justify-content-center mt-4">
    <div class="col-sm-10">
      <div class="form-group mb-4">
        <label class="form-label" for="sql-inspector-table">Tabelle</label>
        <select id="sql-inspector-table" v-model="selectedTable" class="form-select">
          <option :value="null" disabled>Bitte wählen…</option>
          <option v-for="table in tables" :key="table" :value="table">{{ table }}</option>
        </select>
      </div>

      <template v-if="tableData">
        <CollapsibleSection title="Tabellenstruktur" hide-desc>
          <div class="table-responsive">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Spalte</th>
                  <th>Typ</th>
                  <th>Nullable</th>
                  <th>Primärschlüssel</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="column in tableData.columns" :key="column.name">
                  <td>{{ column.name }}</td>
                  <td>{{ column.type }}</td>
                  <td>{{ column.nullable ? 'Ja' : 'Nein' }}</td>
                  <td>
                    <span v-if="column.primary_key" class="badge text-bg-primary">PK</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        <div class="table-responsive mt-3">
          <table class="table table-sm table-striped">
            <thead>
              <tr>
                <th v-for="column in tableData.columns" :key="column.name">{{ column.name }}</th>
              </tr>
            </thead>
            <tbody>
              <!-- Row identity is meaningless across a generic, per-table
              unknown schema (no guaranteed unique column) -- the whole
              array is always replaced wholesale on page/table change
              anyway, so the plain row index is a safe :key here. -->
              <tr v-for="(row, index) in tableData.rows" :key="index">
                <td v-for="column in tableData.columns" :key="column.name">
                  {{ row[column.name] ?? '–' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav v-if="totalPages > 1" aria-label="Seitennavigation">
          <ul class="pagination pagination-sm justify-content-center">
            <li class="page-item" :class="{ disabled: !canGoToPreviousPage }">
              <button
                class="page-link"
                type="button"
                :disabled="!canGoToPreviousPage"
                @click="goToPage(page - 1)"
              >
                Zurück
              </button>
            </li>
            <li class="page-item disabled">
              <span class="page-link">Seite {{ page }} von {{ totalPages }}</span>
            </li>
            <li class="page-item" :class="{ disabled: !canGoToNextPage }">
              <button
                class="page-link"
                type="button"
                :disabled="!canGoToNextPage"
                @click="goToPage(page + 1)"
              >
                Weiter
              </button>
            </li>
          </ul>
        </nav>
        <p class="text-muted small">{{ tableData.total }} Zeile(n) insgesamt.</p>
      </template>
      <div v-else-if="selectedTable" class="text-center">Lade Tabellendaten…</div>
    </div>
  </div>
</template>
