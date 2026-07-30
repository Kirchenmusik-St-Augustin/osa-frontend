import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PopularModal from '../PopularModal.vue'
import type { PopularItem } from '@/composables/useBookings'

const { MockModal } = vi.hoisted(() => {
  class MockModal {
    static instances: MockModal[] = []
    constructor() {
      MockModal.instances.push(this)
    }
  }
  return { MockModal }
})
vi.mock('bootstrap', () => ({ Modal: MockModal }))

const popular: PopularItem = {
  frequent: [{ id: 1, name: 'Muster, Max', total: 5 }],
  recent: [{ id: 2, name: 'Beispiel, Erika', booked: '2026-07-01T11:00:00' }],
}

describe('PopularModal', () => {
  it('constructs a Bootstrap Modal instance on mount, wired to its own DOM element', () => {
    mount(PopularModal, { props: { modalId: 'instruments-1', popular } })
    expect(MockModal.instances).toHaveLength(1)
  })

  it('renders frequent and recent bookers with their counts/dates', () => {
    const wrapper = mount(PopularModal, { props: { modalId: 'instruments-1', popular } })
    expect(wrapper.text()).toContain('Muster, Max (5)')
    expect(wrapper.text()).toContain('Beispiel, Erika')
  })

  it('uses a modal id scoped to the given position', () => {
    const wrapper = mount(PopularModal, { props: { modalId: 'voices-7', popular } })
    expect(wrapper.find('#popularvoices-7').exists()).toBe(true)
  })
})
