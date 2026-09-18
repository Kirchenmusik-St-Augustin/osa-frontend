<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import { useBodyScrollLock } from '@/composables/useBodyScrollLock'

// Vue-owned modal dialog: `v-model` is the single source of truth for whether
// it is open, so there is no imperative plugin instance whose state could
// drift from Vue's or outlive the component. Provides the .modal/.modal-dialog
// shell (Bootstrap's CSS classes only); the caller supplies the
// .modal-content block, since header/body/footer differ per dialog.
//
// - `dismissible`: Escape and a click on the backdrop close the dialog. Turn
//   it off for forms, which may only be left through their own buttons.
// - Teleported to <body> so no ancestor's stacking context or transform can
//   trap the fixed-position dialog under the sticky navbar.
// - Page scroll is locked while open and released on unmount (see
//   useBodyScrollLock), Tab cycles inside the dialog, and focus returns to
//   whatever opened it on close.
const props = withDefaults(defineProps<{ dismissible?: boolean; size?: 'lg' }>(), {
  dismissible: true,
  size: undefined,
})

const open = defineModel<boolean>({ required: true })

const modalElement = useTemplateRef<HTMLElement>('modalElement')

useBodyScrollLock(open)

// Bootstrap's own .fade: a 0.15s opacity transition that honors
// prefers-reduced-motion. Both elements keep the .show class permanently (the
// backdrop needs it for its 50% opacity), so only `opacity-0` -- an
// !important utility -- may express the hidden start/end state.
const fade = {
  enterActiveClass: 'fade',
  leaveActiveClass: 'fade',
  enterFromClass: 'opacity-0',
  leaveToClass: 'opacity-0',
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

let previouslyFocused: HTMLElement | null = null

watch(
  open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      modalElement.value?.focus()
      return
    }
    previouslyFocused?.focus()
    previouslyFocused = null
  },
  { immediate: true },
)

function close(): void {
  open.value = false
}

function handleEscape(): void {
  if (props.dismissible) close()
}

// A drag that starts inside the dialog (e.g. selecting text) and ends on the
// backdrop produces a click on the backdrop too -- only a press that also
// started on the backdrop may dismiss.
let pressStartedOnBackdrop = false

function rememberPress(event: MouseEvent): void {
  pressStartedOnBackdrop = event.target === event.currentTarget
}

function handleBackdropClick(event: MouseEvent): void {
  if (!props.dismissible || !pressStartedOnBackdrop || event.target !== event.currentTarget) return
  close()
}

// The element focus must jump to when Tab/Shift+Tab would otherwise leave the
// dialog, or null to let the browser move focus normally.
function focusWrapTarget(
  modal: HTMLElement,
  focusable: HTMLElement[],
  backwards: boolean,
): HTMLElement | null {
  const first = focusable[0]
  const last = focusable.at(-1)
  if (!first || !last) return modal
  const active = document.activeElement
  if (backwards) return active === first || active === modal ? last : null
  return active === last ? first : null
}

function trapTab(event: KeyboardEvent): void {
  const modal = modalElement.value
  if (!modal) return
  const focusable = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  const target = focusWrapTarget(modal, focusable, event.shiftKey)
  if (!target) return
  event.preventDefault()
  target.focus()
}
</script>

<template>
  <Teleport to="body">
    <Transition v-bind="fade">
      <div
        v-if="open"
        ref="modalElement"
        class="modal d-block show"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        @mousedown="rememberPress"
        @click="handleBackdropClick"
        @keydown.esc="handleEscape"
        @keydown.tab="trapTab"
      >
        <div class="modal-dialog" :class="{ 'modal-lg': size === 'lg' }">
          <slot />
        </div>
      </div>
    </Transition>
    <Transition v-bind="fade">
      <div v-if="open" class="modal-backdrop show"></div>
    </Transition>
  </Teleport>
</template>
