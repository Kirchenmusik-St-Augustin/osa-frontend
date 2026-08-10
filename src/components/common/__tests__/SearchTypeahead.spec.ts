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

  it('renders the results list as a floating overlay, not pushing the page down', async () => {
    const search = vi.fn().mockResolvedValue([{ id: 5, label: 'MOZART, Wolfgang' }])
    const wrapper = mount(SearchTypeahead, { props: { search } })

    await wrapper.find('input').setValue('Mozart')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(wrapper.find('.list-group').classes()).toContain('position-absolute')
  })

  describe('keyboard navigation', () => {
    const threeResults = [
      { id: 1, label: 'HAYDN, Joseph' },
      { id: 2, label: 'MOZART, Wolfgang' },
      { id: 3, label: 'SALIERI, Antonio' },
    ]

    async function mountWithResults() {
      const search = vi.fn().mockResolvedValue(threeResults)
      const wrapper = mount(SearchTypeahead, { props: { search } })
      await wrapper.find('input').setValue('a')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()
      return wrapper
    }

    function activeItems(wrapper: Awaited<ReturnType<typeof mountWithResults>>) {
      return wrapper.findAll('.list-group-item').map((item) => item.classes().includes('active'))
    }

    it('pre-highlights the topmost hit as soon as results arrive', async () => {
      const wrapper = await mountWithResults()
      expect(activeItems(wrapper)).toEqual([true, false, false])
    })

    it('moves the highlight down/up with the arrow keys, clamped at the edges', async () => {
      const wrapper = await mountWithResults()
      const input = wrapper.find('input')

      await input.trigger('keydown', { key: 'ArrowDown' })
      expect(activeItems(wrapper)).toEqual([false, true, false])

      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'ArrowDown' })
      expect(activeItems(wrapper)).toEqual([false, false, true])

      await input.trigger('keydown', { key: 'ArrowUp' })
      expect(activeItems(wrapper)).toEqual([false, true, false])
    })

    it('selects the highlighted result on Enter', async () => {
      const wrapper = await mountWithResults()
      const input = wrapper.find('input')

      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('select')?.[0]).toEqual([2])
    })

    it('re-highlights the first item whenever a new result set arrives', async () => {
      const wrapper = await mountWithResults()
      await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' })
      expect(activeItems(wrapper)).toEqual([false, true, false])

      await wrapper.find('input').setValue('az')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()

      expect(activeItems(wrapper)).toEqual([true, false, false])
    })

    it('hovering a result also moves the highlight', async () => {
      const wrapper = await mountWithResults()
      await wrapper.findAll('.list-group-item')[2]!.trigger('mouseenter')
      expect(activeItems(wrapper)).toEqual([false, false, true])
    })
  })
})
