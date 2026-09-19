import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useNotificationStore } from '@/stores/notifications'

beforeEach(() => {
  setActivePinia(createPinia())
})

const button = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper.findAll('button').find((candidate) => candidate.text() === label)!

describe('ConfirmDialog', () => {
  it('renders nothing while no question is open', () => {
    const wrapper = mount(ConfirmDialog)

    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('shows the question with a "Nein" and a "Ja" button', async () => {
    const wrapper = mount(ConfirmDialog)

    void useNotificationStore().requestConfirmation('Wirklich löschen?')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.modal-body').text()).toBe('Wirklich löschen?')
    expect(button(wrapper, 'Nein').exists()).toBe(true)
    expect(button(wrapper, 'Ja').exists()).toBe(true)
  })

  it('resolves true and closes when "Ja" is clicked', async () => {
    const wrapper = mount(ConfirmDialog)
    const answer = useNotificationStore().requestConfirmation('Wirklich löschen?')
    await wrapper.vm.$nextTick()

    await button(wrapper, 'Ja').trigger('click')

    await expect(answer).resolves.toBe(true)
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('resolves false and closes when "Nein" is clicked', async () => {
    const wrapper = mount(ConfirmDialog)
    const answer = useNotificationStore().requestConfirmation('Wirklich löschen?')
    await wrapper.vm.$nextTick()

    await button(wrapper, 'Nein').trigger('click')

    await expect(answer).resolves.toBe(false)
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('counts Escape as "no"', async () => {
    const wrapper = mount(ConfirmDialog)
    const answer = useNotificationStore().requestConfirmation('Wirklich löschen?')
    await wrapper.vm.$nextTick()

    await wrapper.find('.modal').trigger('keydown', { key: 'Escape' })

    await expect(answer).resolves.toBe(false)
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('shows the newer question when one replaces an unanswered one', async () => {
    const wrapper = mount(ConfirmDialog)
    const store = useNotificationStore()
    const first = store.requestConfirmation('erste Frage')
    await wrapper.vm.$nextTick()

    void store.requestConfirmation('zweite Frage')
    await wrapper.vm.$nextTick()

    await expect(first).resolves.toBe(false)
    expect(wrapper.find('.modal-body').text()).toBe('zweite Frage')
  })

  it('can be opened again after having been answered', async () => {
    const wrapper = mount(ConfirmDialog)
    const store = useNotificationStore()
    void store.requestConfirmation('erste Frage')
    await wrapper.vm.$nextTick()
    await button(wrapper, 'Nein').trigger('click')

    void store.requestConfirmation('zweite Frage')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.modal-body').text()).toBe('zweite Frage')
  })
})
