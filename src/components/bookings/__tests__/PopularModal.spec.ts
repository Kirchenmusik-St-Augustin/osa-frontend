import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PopularModal from '../PopularModal.vue'
import type { PopularItem } from '@/composables/useBookings'

const popular: PopularItem = {
  frequent: [{ id: 1, name: 'Muster, Max', total: 5 }],
  recent: [{ id: 2, name: 'Beispiel, Erika', booked: '2026-07-01T11:00:00' }],
}

describe('PopularModal', () => {
  it('renders nothing while closed', () => {
    const wrapper = mount(PopularModal, { props: { modelValue: false, popular } })

    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('renders frequent and recent bookers with their counts/dates when open', () => {
    const wrapper = mount(PopularModal, { props: { modelValue: true, popular } })

    expect(wrapper.text()).toContain('Muster, Max (5)')
    expect(wrapper.text()).toContain('Beispiel, Erika')
  })

  it('asks its parent to close when the close button is clicked', async () => {
    const wrapper = mount(PopularModal, { props: { modelValue: true, popular } })

    await wrapper.find('.btn-close').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
