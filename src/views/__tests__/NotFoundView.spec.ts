import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NotFoundView from '../NotFoundView.vue'

describe('NotFoundView', () => {
  it('renders a not-found message', () => {
    expect(mount(NotFoundView).text()).toContain('nicht gefunden')
  })
})
