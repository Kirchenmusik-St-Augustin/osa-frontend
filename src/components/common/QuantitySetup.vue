<script setup lang="ts">
// Read-only table used directly by Ordinariumwork's Show page, and reused
// (with-controls) as the left-hand table inside QuantityEditor.vue. Native
// `title` attributes serve as tooltips (hover-text UX, no extra dependency
// for three tooltip strings).
export interface QuantitySetupEntry {
  id: string
  name: string
  quantity: number
  // Omitted/true = active; explicitly false flags an archived Instrument/
  // Voice/Choirjob still present in this setup -- e.g. copied in from an
  // Ordinariumwork's own setup, which is deliberately never re-filtered.
  active?: boolean
}

withDefaults(
  defineProps<{
    setup: QuantitySetupEntry[]
    withControls?: boolean
  }>(),
  {
    withControls: false,
  },
)

const emit = defineEmits<{
  remove: [id: string]
  modify: [id: string, increase: boolean]
}>()
</script>

<template>
  <div class="table-responsive">
    <table class="table table-striped table-sm">
      <tbody>
        <tr v-for="item in setup" :key="item.id">
          <td class="text-start">
            <button
              v-if="withControls"
              type="button"
              class="btn btn-link btn-sm p-0 me-1 text-reset"
              title="entfernen"
              aria-label="entfernen"
              @click.prevent="emit('remove', item.id)"
            >
              <i class="fas fa-trash" aria-hidden="true"></i>
            </button>
            <span>{{ item.name }}</span>
            <small v-if="item.active === false" class="text-muted ms-1">(archiviert)</small>
          </td>
          <td class="text-end">
            <span>{{ item.quantity }}</span>
            <button
              v-if="withControls"
              type="button"
              class="btn btn-link btn-sm p-0 ms-1 text-reset"
              title="verringern"
              aria-label="verringern"
              @click.prevent="emit('modify', item.id, false)"
            >
              <i class="fas fa-minus-circle" aria-hidden="true"></i>
            </button>
            <button
              v-if="withControls"
              type="button"
              class="btn btn-link btn-sm p-0 ms-1 text-reset"
              title="erhöhen"
              aria-label="erhöhen"
              @click.prevent="emit('modify', item.id, true)"
            >
              <i class="fas fa-plus-circle" aria-hidden="true"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
