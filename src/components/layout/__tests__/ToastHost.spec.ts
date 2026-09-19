import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ToastHost from '../ToastHost.vue'
import { useNotificationStore } from '@/stores/notifications'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('ToastHost', () => {
  it('renders nothing but its container while there are no toasts', () => {
    const wrapper = mount(ToastHost)

    expect(wrapper.find('.toast-container').exists()).toBe(true)
    expect(wrapper.find('.toast').exists()).toBe(false)
  })

  it('renders a success toast politely announced with a success color', async () => {
    const wrapper = mount(ToastHost)

    useNotificationStore().showToast('Element gespeichert')
    await wrapper.vm.$nextTick()

    const toast = wrapper.find('.toast')
    expect(toast.text()).toContain('Element gespeichert')
    expect(toast.attributes('role')).toBe('status')
    expect(toast.classes()).toContain('text-bg-success')
    expect(toast.find('.fa-check-circle').exists()).toBe(true)
  })

  it('renders an error toast assertively announced with a danger color', async () => {
    const wrapper = mount(ToastHost)

    useNotificationStore().showToast('Fehler', true)
    await wrapper.vm.$nextTick()

    const toast = wrapper.find('.toast')
    expect(toast.attributes('role')).toBe('alert')
    expect(toast.classes()).toContain('text-bg-danger')
    expect(toast.find('.fa-exclamation-circle').exists()).toBe(true)
  })

  it('stacks several toasts in the order they were raised', async () => {
    const wrapper = mount(ToastHost)
    const store = useNotificationStore()

    store.showToast('erste')
    store.showToast('zweite')
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.toast').map((toast) => toast.text())).toEqual(['erste', 'zweite'])
  })

  it('times the progress bar with the store display time', async () => {
    const wrapper = mount(ToastHost)

    useNotificationStore().showToast('gespeichert')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.toast-progress').attributes('style')).toContain(
      '--toast-duration: 4000ms',
    )
  })

  it('removes a toast when its close button is clicked', async () => {
    const wrapper = mount(ToastHost)
    useNotificationStore().showToast('gespeichert')
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-close').trigger('click')

    expect(wrapper.find('.toast').exists()).toBe(false)
  })
})
