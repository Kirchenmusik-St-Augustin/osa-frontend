import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppLayout from '../AppLayout.vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'

describe('AppLayout', () => {
  it('renders AppNavbar inside the container', () => {
    const wrapper = mount(AppLayout)
    expect(wrapper.find('#container.container').exists()).toBe(true)
    expect(wrapper.findComponent(AppNavbar).exists()).toBe(true)
  })
})
