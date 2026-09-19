import { describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import AppModal from '../AppModal.vue'

const CONTENT = `
  <div class="modal-content">
    <button id="first" type="button">first</button>
    <input id="middle" />
    <button id="last" type="button">last</button>
    <button id="disabled" type="button" disabled>disabled</button>
  </div>`

// Real Teleport here (the global test setup stubs it): the dialog must end up
// directly under <body>, outside the mounted wrapper.
function mountModal(props: { modelValue: boolean; dismissible?: boolean; size?: 'lg' }) {
  return mount(AppModal, {
    props,
    slots: { default: CONTENT },
    attachTo: document.body,
    global: { stubs: { teleport: false } },
  })
}

const modalElement = () => document.body.querySelector<HTMLElement>('.modal')
const backdropElement = () => document.body.querySelector<HTMLElement>('.modal-backdrop')
const byId = (id: string) => document.getElementById(id) as HTMLElement

describe('AppModal', () => {
  it('renders nothing while closed', () => {
    mountModal({ modelValue: false })

    expect(modalElement()).toBeNull()
    expect(backdropElement()).toBeNull()
    expect(document.body.classList.contains('modal-open')).toBe(false)
  })

  it('teleports the dialog and its backdrop out of the wrapper into <body> when open', () => {
    const wrapper = mountModal({ modelValue: true })

    expect(document.body.contains(modalElement())).toBe(true)
    expect(document.body.contains(backdropElement())).toBe(true)
    expect(wrapper.element.contains(modalElement())).toBe(false)
    expect(modalElement()?.getAttribute('role')).toBe('dialog')
    expect(modalElement()?.getAttribute('aria-modal')).toBe('true')
    expect(byId('first')).not.toBeNull()
  })

  it('applies the large size class only when asked for', () => {
    mountModal({ modelValue: true, size: 'lg' })
    expect(modalElement()?.querySelector('.modal-dialog')?.classList).toContain('modal-lg')
  })

  it('locks page scrolling while open and unlocks on close', async () => {
    const wrapper = mountModal({ modelValue: true })
    expect(document.body.classList.contains('modal-open')).toBe(true)

    await wrapper.setProps({ modelValue: false })

    expect(document.body.classList.contains('modal-open')).toBe(false)
    expect(modalElement()).toBeNull()
  })

  it('releases the scroll lock and removes the dialog when unmounted while open', () => {
    const wrapper = mountModal({ modelValue: true })

    wrapper.unmount()

    expect(document.body.classList.contains('modal-open')).toBe(false)
    expect(modalElement()).toBeNull()
    expect(backdropElement()).toBeNull()
  })

  describe('dismissing', () => {
    it('closes on Escape when dismissible', async () => {
      const wrapper = mountModal({ modelValue: true })

      await modalElement()!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    })

    it('ignores Escape when not dismissible', () => {
      const wrapper = mountModal({ modelValue: true, dismissible: false })

      modalElement()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('closes on a full click (press + release) on the backdrop area', () => {
      const wrapper = mountModal({ modelValue: true })
      const modal = modalElement()!

      modal.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      modal.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    })

    it('does not close when a press started inside the dialog ends on the backdrop', () => {
      // e.g. selecting text and releasing the mouse outside the dialog.
      const wrapper = mountModal({ modelValue: true })
      const modal = modalElement()!

      byId('first').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      modal.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('does not close on a click inside the dialog', () => {
      const wrapper = mountModal({ modelValue: true })

      byId('first').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      byId('first').dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('does not close on a backdrop click when not dismissible', () => {
      const wrapper = mountModal({ modelValue: true, dismissible: false })
      const modal = modalElement()!

      modal.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      modal.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  describe('focus handling', () => {
    it('moves focus into the dialog on open and back to the opener on close', async () => {
      const opener = document.createElement('button')
      document.body.appendChild(opener)
      opener.focus()

      const wrapper = mountModal({ modelValue: false })
      await wrapper.setProps({ modelValue: true })
      await nextTick()
      expect(document.activeElement).toBe(modalElement())

      await wrapper.setProps({ modelValue: false })
      expect(document.activeElement).toBe(opener)
      opener.remove()
    })

    it('wraps Tab from the last focusable element to the first', () => {
      mountModal({ modelValue: true })
      byId('last').focus()
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })

      byId('last').dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(byId('first'))
    })

    it('wraps Shift+Tab from the first focusable element to the last, skipping disabled ones', () => {
      mountModal({ modelValue: true })
      byId('first').focus()
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })

      byId('first').dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(byId('last'))
    })

    it('wraps Shift+Tab from the dialog container itself to the last element', () => {
      mountModal({ modelValue: true })
      modalElement()!.focus()
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })

      modalElement()!.dispatchEvent(event)

      expect(document.activeElement).toBe(byId('last'))
    })

    it('leaves Tab between inner elements to the browser', () => {
      mountModal({ modelValue: true })
      byId('first').focus()
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })

      byId('first').dispatchEvent(event)

      expect(event.defaultPrevented).toBe(false)
    })
  })

  it('reacts to a parent-owned v-model', async () => {
    const Parent = defineComponent({
      components: { AppModal },
      setup: () => ({ open: ref(false) }),
      template: '<AppModal v-model="open"><div class="modal-content">x</div></AppModal>',
    })
    const wrapper = mount(Parent, { global: { stubs: { teleport: false } } })
    expect(modalElement()).toBeNull()

    wrapper.vm.open = true
    await nextTick()
    expect(modalElement()).not.toBeNull()

    await modalElement()!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    await nextTick()
    expect(modalElement()).toBeNull()
  })
})
