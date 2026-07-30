import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SingleCastList from '../SingleCastList.vue'
import type { CastMember } from '@/composables/useBookings'

function cast(): CastMember[] {
  return [
    { id: 1, name: 'Regular', fee: 80 },
    { id: 2, name: 'Standby', fee: 80 },
  ]
}

describe('SingleCastList', () => {
  it('marks entries within `required` as regular (green/bold), rest as standby (blue)', () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1 } })
    const spans = wrapper.findAll('span')
    expect(spans[0]?.classes()).toContain('text-success')
    expect(spans[1]?.classes()).toContain('text-info')
  })

  it('emits cast-changed with entries swapped on move up/down', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1 } })
    const downArrows = wrapper.findAll('.fa-arrow-down')
    await downArrows[0]?.trigger('click')
    expect(wrapper.emitted('cast-changed')?.[0]?.[0]).toEqual([
      { id: 2, name: 'Standby', fee: 80 },
      { id: 1, name: 'Regular', fee: 80 },
    ])
  })

  it('does not emit when moving beyond the boundary', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1 } })
    const upArrows = wrapper.findAll('.fa-arrow-up')
    await upArrows[0]?.trigger('click') // first entry, already at top
    expect(wrapper.emitted('cast-changed')).toBeUndefined()
  })

  it('emits cast-changed without the removed entry', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1 } })
    const removeIcons = wrapper.findAll('.fa-times')
    await removeIcons[0]?.trigger('click')
    expect(wrapper.emitted('cast-changed')?.[0]?.[0]).toEqual([{ id: 2, name: 'Standby', fee: 80 }])
  })
})
