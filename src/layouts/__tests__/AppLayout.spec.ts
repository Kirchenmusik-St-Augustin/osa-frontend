import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppLayout from '../AppLayout.vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'

// AppNavbar (rendered inside AppLayout) needs a real Pinia instance
// (useAuthStore()) and a real router instance (useRouter()) -- the global
// RouterLink/RouterView stubs from vitest.setup.ts only cover template
// component usage, not these script-level composable calls.
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
})

describe('AppLayout', () => {
  it('renders AppNavbar inside the container', () => {
    const wrapper = mount(AppLayout, {
      global: { plugins: [createPinia(), router] },
    })
    expect(wrapper.find('#container.container').exists()).toBe(true)
    expect(wrapper.findComponent(AppNavbar).exists()).toBe(true)
  })
})
