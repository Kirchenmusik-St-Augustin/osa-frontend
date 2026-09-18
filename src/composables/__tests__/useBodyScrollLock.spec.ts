import { describe, expect, it } from 'vitest'
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
})
