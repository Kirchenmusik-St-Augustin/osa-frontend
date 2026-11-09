import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useBodyScrollLock } from '../useBodyScrollLock'

function mountLock(isLocked: Ref<boolean>) {
  return mount(
    defineComponent({
      setup() {
        useBodyScrollLock(isLocked)
        return () => h('div')
      },
    }),
  )
}

const isLocked = () => document.body.classList.contains('modal-open')
const compensation = () => document.body.style.getPropertyValue('--scrollbar-compensation')

// jsdom has no layout, so the viewport and the scrollbar-free content width
// are set by hand: the difference between the two is the scrollbar.
function setViewport(innerWidth: number, clientWidth: number): void {
  vi.stubGlobal('innerWidth', innerWidth)
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: clientWidth,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document.documentElement, 'clientWidth')
})

describe('useBodyScrollLock', () => {
  it('locks the page while the flag is true and unlocks when it turns false', async () => {
    const flag = ref(false)
    mountLock(flag)
    expect(isLocked()).toBe(false)

    flag.value = true
    await nextTick()
    expect(isLocked()).toBe(true)
    expect(document.body.style.getPropertyValue('--scrollbar-compensation')).toMatch(/^\d+px$/)

    flag.value = false
    await nextTick()
    expect(isLocked()).toBe(false)
    expect(document.body.style.getPropertyValue('--scrollbar-compensation')).toBe('')
  })

  it('locks immediately when the flag starts out true', () => {
    mountLock(ref(true))

    expect(isLocked()).toBe(true)
  })

  it('releases the lock when the component unmounts while still locked', () => {
    const wrapper = mountLock(ref(true))
    expect(isLocked()).toBe(true)

    wrapper.unmount()

    expect(isLocked()).toBe(false)
  })

  it('keeps the page locked until the LAST of several holders lets go', async () => {
    const first = ref(true)
    const second = ref(true)
    mountLock(first)
    mountLock(second)

    first.value = false
    await nextTick()
    expect(isLocked()).toBe(true)

    second.value = false
    await nextTick()
    expect(isLocked()).toBe(false)
  })

  it('does not release twice when a holder that already let go unmounts', async () => {
    const first = ref(true)
    const second = ref(true)
    const firstWrapper = mountLock(first)
    mountLock(second)

    first.value = false
    await nextTick()
    firstWrapper.unmount()

    expect(isLocked()).toBe(true)
  })

  it('compensates exactly the width of the scrollbar that disappears', () => {
    setViewport(1024, 1009)

    mountLock(ref(true))

    expect(compensation()).toBe('15px')
  })

  it('never compensates a negative width', () => {
    setViewport(1024, 1100)

    mountLock(ref(true))

    expect(compensation()).toBe('0px')
  })

  it('measures the scrollbar only for the first holder, not again for a stacked one', () => {
    setViewport(1024, 1009)
    mountLock(ref(true))
    // With the first modal open the scrollbar is gone, so a second measurement
    // would read 0 and make the page jump sideways.
    setViewport(1024, 1024)

    mountLock(ref(true))

    expect(compensation()).toBe('15px')
  })
})
