<script setup lang="ts">
// 1:1 port of Legacy's Components/Common/QuantitySetupComponent.vue --
// read-only table used directly by Ordinariumwork's Show page, and
// reused (with-controls) as the left-hand table inside QuantityEditor.vue.
// Native `title` attributes replace Legacy's vue-tippy tooltips (same
// hover-text UX, no extra dependency for three tooltip strings).
export interface QuantitySetupEntry {
  id: number
  name: string
  quantity: number
  // Omitted/true = active; explicitly false flags an archived Instrument/
  // Voice/Choirjob still present in this setup (osa-only addition, see
  // CLAUDE.md section 3's Phase 1 boundary) -- e.g. copied in from an
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
  remove: [id: number]
  modify: [id: number, increase: boolean]
}>()
</script>

<template>
  <div class="table-responsive">
    <table class="table table-striped table-sm">
      <tbody>
        <tr v-for="item in setup" :key="item.id">
          <td class="text-start">
            <i
              v-if="withControls"
              class="c-pointer me-1 fas fa-trash"
              title="entfernen"
              @click.prevent="emit('remove', item.id)"
            ></i>
            <span>{{ item.name }}</span>
            <small v-if="item.active === false" class="text-muted ms-1">(archiviert)</small>
          </td>
          <td class="text-end">
            <span>{{ item.quantity }}</span>
            <i
              v-if="withControls"
              class="c-pointer ms-1 fas fa-minus-circle"
              title="verringern"
              @click.prevent="emit('modify', item.id, false)"
            ></i>
            <i
              v-if="withControls"
              class="c-pointer ms-1 fas fa-plus-circle"
              title="erhöhen"
              @click.prevent="emit('modify', item.id, true)"
            ></i>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
