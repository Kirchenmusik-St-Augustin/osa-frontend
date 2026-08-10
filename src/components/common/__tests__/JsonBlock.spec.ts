import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import JsonBlock from '../JsonBlock.vue'

describe('JsonBlock', () => {
  it('renders an indented JSON.stringify of the value', () => {
    const wrapper = mount(JsonBlock, { props: { value: { foo: 'bar', n: 1 } } })

    expect(wrapper.find('pre').text()).toBe(JSON.stringify({ foo: 'bar', n: 1 }, null, 2))
  })

  it('renders "null" for a null value', () => {
    const wrapper = mount(JsonBlock, { props: { value: null } })

    expect(wrapper.find('pre').text()).toBe('null')
  })
})
