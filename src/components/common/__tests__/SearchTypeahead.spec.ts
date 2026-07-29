import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SearchTypeahead from '../SearchTypeahead.vue'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('SearchTypeahead', () => {
  it('does not search for an empty/whitespace-only query', async () => {
    const search = vi.fn()
    const wrapper = mount(SearchTypeahead, { props: { search } })

    await wrapper.find('input').setValue('   ')
    await vi.advanceTimersByTimeAsync(300)

    expect(search).not.toHaveBeenCalled()
  })

  it('debounces the search call while typing', async () => {
    const search = vi.fn().mockResolvedValue([])
    const wrapper = mount(SearchTypeahead, { props: { search } })

    await wrapper.find('input').setValue('Moz')
    await vi.advanceTimersByTimeAsync(100)
    await wrapper.find('input').setValue('Mozart')
    await vi.advanceTimersByTimeAsync(300)

    expect(search).toHaveBeenCalledOnce()
    expect(search).toHaveBeenCalledWith('Mozart')
  })

  it('renders results and selects one on click, clearing the query', async () => {
    const search = vi.fn().mockResolvedValue([{ id: 5, label: 'MOZART, Wolfgang' }])
    const wrapper = mount(SearchTypeahead, { props: { search } })

    await wrapper.find('input').setValue('Mozart')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    const result = wrapper.find('.list-group-item')
    expect(result.text()).toBe('MOZART, Wolfgang')

    await result.trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual([5])
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })
})
