<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useClickOutside } from '@/composables/useClickOutside'

// Vue-owned dropdown menu: `isOpen` is the single source of truth, rendered
// through Bootstrap's `.show` class. Bootstrap's own Dropdown plugin is not
// used -- via its data-attribute API it creates an instance per toggle that
// nothing ever disposes, so every toggled element stayed referenced from an
// internal map after its component unmounted.
//
// Closes on: a click on the toggle, a click anywhere outside, Escape, and a
// click inside the menu (picking an entry). Positioning is Bootstrap's static
// CSS (`data-bs-popper="static"`), so a menu never flips upward on its own.
withDefaults(
  defineProps<{
    toggleClass?: string
    menuTag?: 'div' | 'ul'
    menuEnd?: boolean
    menuTheme?: 'light' | 'dark'
  }>(),
  { toggleClass: 'btn', menuTag: 'div', menuEnd: false, menuTheme: undefined },
)

const isOpen = ref(false)
const rootElement = useTemplateRef<HTMLElement>('rootElement')

useClickOutside(rootElement, () => {
  isOpen.value = false
})
</script>

<template>
  <div ref="rootElement" class="dropdown" @keydown.esc="isOpen = false">
    <button
      type="button"
      class="dropdown-toggle"
      :class="toggleClass"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <slot name="toggle" />
    </button>
    <component
      :is="menuTag"
      class="dropdown-menu"
      :class="{ show: isOpen, 'dropdown-menu-end': menuEnd }"
      data-bs-popper="static"
      :data-bs-theme="menuTheme"
      @click="isOpen = false"
    >
      <slot />
    </component>
  </div>
</template>
