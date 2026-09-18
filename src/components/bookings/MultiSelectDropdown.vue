<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import type { BookableUser } from '@/composables/useBookings'
import { useClickOutside } from '@/composables/useClickOutside'

// A badge button ("N ausgewählt") that toggles a floating, tabbed panel
// (one tab per group, e.g. "Anfragen"/"direkt buchen") listing selectable
// candidates. Both the open state and the active tab are plain Vue refs, and
// only the active group is rendered at all -- no Bootstrap tab plugin or
// .tab-pane visibility CSS is involved.
//
// The panel opens upward (see .multiselect-panel's `bottom: 100%` in <style> below)
// so the "hinzufügen"/"zurückweisen" buttons below it stay reachable while
// the panel is open.
export interface MultiSelectGroup {
  label: string
  values: BookableUser[]
}

const props = defineProps<{ options: MultiSelectGroup[] }>()

const model = defineModel<string[]>({ required: true })

const isOpen = ref(false)
const activeTab = ref(0)
const rootElement = useTemplateRef<HTMLElement>('rootElement')

function isSelected(id: string): boolean {
  return model.value.includes(id)
}

function toggleSelection(id: string): void {
  model.value = isSelected(id)
    ? model.value.filter((candidateId) => candidateId !== id)
    : [...model.value, id]
}

const activeGroup = computed(() => props.options[activeTab.value])

useClickOutside(rootElement, () => {
  isOpen.value = false
})

// A group (e.g. "Anfragen") can disappear from `options` once its last
// candidate is booked/rejected elsewhere -- keep the active tab in range.
watch(
  () => props.options.length,
  () => (activeTab.value = 0),
)
</script>

<template>
  <div ref="rootElement">
    <span class="border rounded p-1 m-1 c-pointer bg-white" @click="isOpen = !isOpen">
      <span class="ms-2">{{ model.length }} ausgewählt</span>
      <i class="fas fa-caret-down px-1 text-primary"></i>
    </span>
    <!--
      A real block-level div (not a span) -- .multiselect has no explicit
      width, so it fills the containing column and gives the panel's
      `width: 140%` below something meaningful to resolve against. An inline
      wrapper here would collapse to near-zero width and silently shrink the
      panel to a sliver.
    -->
    <div class="multiselect">
      <div v-if="isOpen" class="multiselect-panel border rounded p-1 text-nowrap bg-white">
        <ul class="nav nav-underline justify-content-end">
          <li v-for="(group, index) in props.options" :key="group.label" class="nav-item">
            <a
              class="nav-link text-primary"
              :class="{ active: index === activeTab }"
              href="#"
              @click.prevent="activeTab = index"
            >
              {{ group.label }}
            </a>
          </li>
        </ul>
        <div v-if="activeGroup" class="list-group text-start itemgroup">
          <div
            v-for="item in activeGroup.values"
            :key="item.id"
            class="list-group-item list-group-item-action c-pointer"
            @click="toggleSelection(item.id)"
          >
            <div class="text-end">
              <span>{{ item.name }}</span>
              <i
                class="px-2 far"
                :class="isSelected(item.id) ? 'fa-square-check' : 'fa-square'"
              ></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.multiselect {
  position: relative;
}

.multiselect .multiselect-panel {
  position: absolute;
  right: 0;
  bottom: 100%;
  margin-bottom: 1.8em;
  z-index: 99;
  overflow: hidden;
  min-width: 140%;
  width: 140%;
  max-width: 140%;
  overflow-y: scroll;
}

.itemgroup {
  max-height: 20em;
}
</style>
