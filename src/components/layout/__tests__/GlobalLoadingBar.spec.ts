import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import GlobalLoadingBar from '../GlobalLoadingBar.vue'
import { useLoadingStore } from '@/stores/loading'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('GlobalLoadingBar', () => {
  it('renders nothing while no request is in flight', () => {
    const wrapper = mount(GlobalLoadingBar)

    expect(wrapper.find('.global-loading-bar').exists()).toBe(false)
  })

  it('renders the bar with a progressbar role while a request is in flight', async () => {
    const loadingStore = useLoadingStore()
    const wrapper = mount(GlobalLoadingBar)

    loadingStore.startLoading()
    await wrapper.vm.$nextTick()

    const bar = wrapper.find('.global-loading-bar')
    expect(bar.exists()).toBe(true)
    expect(bar.attributes('role')).toBe('progressbar')
  })

  it('disappears again once the last in-flight request finishes', async () => {
    const loadingStore = useLoadingStore()
    const wrapper = mount(GlobalLoadingBar)

    loadingStore.startLoading()
    loadingStore.startLoading()
    await wrapper.vm.$nextTick()
    loadingStore.stopLoading()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.global-loading-bar').exists()).toBe(true)

    loadingStore.stopLoading()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.global-loading-bar').exists()).toBe(false)
  })
})
