<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import type { BookableUser } from '@/composables/useBookings'

// Port of Legacy's MultiSelectComponent.vue -- a badge button ("N
// ausgewählt") that toggles a floating, tabbed dropdown (one tab per
// group, e.g. "Anfragen"/"direkt buchen") listing selectable candidates.
// Legacy drives the tabs via Bootstrap's own data-bs-toggle="tab" JS,
// decoupled from Vue's reactivity -- reimplemented here as a plain Vue
// ref instead, since piggy-backing on Bootstrap's imperative DOM toggling
// for state Vue itself needs to read/write would be a fragile double
// source of truth. Same visible tab-switch behavior, no Bootstrap JS
// dependency for it. Closing on an outside click (Legacy: vue3-click-away)
// is reimplemented as a small local document-click listener instead of
// pulling in that package for one use site.
//
// Deliberate parity deviation (User-confirmed 2026-07-31): Legacy opens the
// panel downward, which can cover the "hinzufügen"/"zurückweisen" buttons
// below it. Opens upward here instead (see .dropdown's `bottom: 100%` in
// <style> below) so those buttons stay reachable while the panel is open.
export interface MultiSelectGroup {
  label: string
  values: BookableUser[]
}

const props = defineProps<{ options: MultiSelectGroup[] }>()

const model = defineModel<number[]>({ required: true })

const isOpen = ref(false)
const activeTab = ref(0)
const rootElement = useTemplateRef<HTMLElement>('rootElement')

function isSelected(id: number): boolean {
  return model.value.includes(id)
}

function toggleSelection(id: number): void {
  model.value = isSelected(id)
    ? model.value.filter((candidateId) => candidateId !== id)
    : [...model.value, id]
}

function handleDocumentClick(event: MouseEvent): void {
  if (!rootElement.value?.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', handleDocumentClick))

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
      A real block-level div (not a span) -- Legacy's own .multiselect div
      has no explicit width, so it fills the containing column and gives
      the dropdown's `width: 140%` below something meaningful to resolve
      against. An inline wrapper here collapses to near-zero width, which
      is what silently shrank the dropdown to a sliver before this fix.
    -->
    <div class="multiselect">
      <div v-if="isOpen" class="dropdown border rounded p-1 text-nowrap bg-white">
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
        <div class="tab-content">
          <div
            v-for="(group, index) in props.options"
            :key="group.label"
            class="tab-pane"
            :class="{ active: index === activeTab }"
          >
            <div class="list-group text-start itemgroup">
              <div
                v-for="item in group.values"
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
    </div>
  </div>
</template>

<style scoped>
.multiselect {
  position: relative;
}

.multiselect .dropdown {
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
