import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeView from '../HomeView.vue'

describe('HomeView', () => {
  it('renders the scaffolding placeholder text', () => {
    expect(mount(HomeView).text()).toContain('Grundgerüst lauffähig')
  })
})
