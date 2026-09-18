import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, useTemplateRef } from 'vue'
import { mount } from '@vue/test-utils'
import { useClickOutside } from '../useClickOutside'

const onOutsideClick = vi.fn()

// Two siblings: the watched box (with a button that removes itself on click)
// and an unrelated element outside of it.
const Host = defineComponent({
  setup() {
    const box = useTemplateRef<HTMLElement>('box')
    const showRemovable = ref(true)
    useClickOutside(box, onOutsideClick)
    return () =>
      h('div', [
        h('div', { ref: 'box', id: 'box' }, [
          h('span', { id: 'inside' }, 'inside'),
          showRemovable.value
            ? h(
                'button',
                {
                  id: 'removable',
                  onClick: () => {
                    showRemovable.value = false
                  },
                },
                'remove me',
              )
            : null,
        ]),
        h('span', { id: 'outside' }, 'outside'),
      ])
  },
})

afterEach(() => {
  onOutsideClick.mockReset()
})

describe('useClickOutside', () => {
  it('calls the handler for a click outside the watched element', () => {
    mount(Host, { attachTo: document.body })

    document.getElementById('outside')!.click()

    expect(onOutsideClick).toHaveBeenCalledOnce()
  })

  it('ignores a click inside the watched element', () => {
    mount(Host, { attachTo: document.body })

    document.getElementById('inside')!.click()

    expect(onOutsideClick).not.toHaveBeenCalled()
  })

  it('still counts a click as inside when its target is detached by the click itself', async () => {
    // Vue flushes the removal between the button's own handler and the
    // document-level listener -- a contains(event.target) check would see a
    // detached node and wrongly report an outside click.
    mount(Host, { attachTo: document.body })
    const removable = document.getElementById('removable')!

    removable.click()
    await nextTick()

    expect(document.getElementById('removable')).toBeNull()
    expect(onOutsideClick).not.toHaveBeenCalled()
  })

  it('stops listening once the component unmounts', () => {
    const wrapper = mount(Host, { attachTo: document.body })
    const outside = document.getElementById('outside')!

    wrapper.unmount()
    document.body.click()

    expect(onOutsideClick).not.toHaveBeenCalled()
    expect(outside.isConnected).toBe(false)
  })
})
