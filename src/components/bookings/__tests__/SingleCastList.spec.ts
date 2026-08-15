import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SingleCastList from '../SingleCastList.vue'
import type { CastMember, NotBookedEntry } from '@/composables/useBookings'

// vuedraggable/SortableJS drive real drag gestures via native pointer/touch
// events jsdom doesn't implement -- stubbed minimally instead (same
// established pattern as DateTimePicker.spec.ts's vue-flatpickr-component
// mock), rendering through the REAL #item scoped slot so every existing
// row-markup assertion below keeps working unmodified, while giving tests
// a way to (a) inspect the mobile drag options passed through, and (b)
// simulate "a drag just happened" by emitting update:modelValue directly.
vi.mock('vuedraggable', () => ({
  default: {
    name: 'draggable',
    props: [
      'modelValue',
      'itemKey',
      'handle',
      'delay',
      'delayOnTouchOnly',
      'touchStartThreshold',
      'animation',
      'ghostClass',
      'chosenClass',
    ],
    emits: ['update:modelValue'],
    template: `
      <div>
        <template v-for="(element, index) in modelValue" :key="element.id">
          <slot name="item" :element="element" :index="index" />
        </template>
      </div>
    `,
  },
}))

function cast(): CastMember[] {
  return [
    { id: 1, name: 'Regular', fee: 80 },
    { id: 2, name: 'Standby', fee: 80 },
  ]
}

function notBooked(): NotBookedEntry[] {
  return [{ id: 3, name: 'REJECTED, Kandidat' }]
}

describe('SingleCastList', () => {
  it('marks entries within `required` as regular (green/bold), rest as standby (blue)', () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const rows = wrapper.findAll('small')
    expect(rows[0]?.classes()).toContain('text-success')
    expect(rows[1]?.classes()).toContain('text-info')
  })

  it('emits cast-changed with entries swapped on move up/down', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const downArrows = wrapper.findAll('.fa-arrow-down')
    await downArrows[0]?.trigger('click')
    expect(wrapper.emitted('cast-changed')?.[0]?.[0]).toEqual([
      { id: 2, name: 'Standby', fee: 80 },
      { id: 1, name: 'Regular', fee: 80 },
    ])
  })

  it('does not emit when moving beyond the boundary', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const upArrows = wrapper.findAll('.fa-arrow-up')
    await upArrows[0]?.trigger('click') // first entry, already at top
    expect(wrapper.emitted('cast-changed')).toBeUndefined()
  })

  it('emits cast-changed without the removed entry', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const removeIcons = wrapper.findAll('.fa-times')
    await removeIcons[0]?.trigger('click')
    expect(wrapper.emitted('cast-changed')?.[0]?.[0]).toEqual([{ id: 2, name: 'Standby', fee: 80 }])
  })

  it('renders its own "nicht gebucht" section when notBooked entries are passed', () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: notBooked() },
    })
    expect(wrapper.text()).toContain('nicht gebucht:')
    expect(wrapper.text()).toContain('REJECTED, Kandidat')
  })

  it('omits the "nicht gebucht" section entirely when there is nothing not booked', () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    expect(wrapper.text()).not.toContain('nicht gebucht')
  })

  it('emits remove-not-booked with the entry id, not cast-changed', async () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: notBooked() },
    })
    const notBookedRemoveIcon = wrapper.findAll('.fa-times').at(-1)
    await notBookedRemoveIcon?.trigger('click')
    expect(wrapper.emitted('remove-not-booked')?.[0]).toEqual([3])
    expect(wrapper.emitted('cast-changed')).toBeUndefined()
  })

  it('renders a drag handle icon per cast row', () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    expect(wrapper.findAll('.drag-handle')).toHaveLength(cast().length)
  })

  it('passes mobile-friendly SortableJS options to the draggable wrapper', () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const draggableStub = wrapper.findComponent({ name: 'draggable' })
    expect(draggableStub.props()).toMatchObject({
      handle: '.drag-handle',
      delay: 200,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
    })
  })

  it('emits cast-changed with the array vuedraggable reports on a reorder', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const reordered = [cast()[1]!, cast()[0]!]
    const draggableStub = wrapper.findComponent({ name: 'draggable' })

    await draggableStub.vm.$emit('update:modelValue', reordered)

    expect(wrapper.emitted('cast-changed')?.[0]?.[0]).toEqual(reordered)
  })

  it('resyncs the rendered list when `cast` is replaced externally', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const newCast: CastMember[] = [{ id: 4, name: 'ADDED, Kandidat', fee: 90 }]

    await wrapper.setProps({ cast: newCast })

    expect(wrapper.text()).toContain('ADDED, Kandidat')
    expect(wrapper.text()).not.toContain('Regular')
  })

  it('does not reset the rendered order when the parent echoes back identical content via a new array reference', async () => {
    const wrapper = mount(SingleCastList, { props: { cast: cast(), required: 1, notBooked: [] } })
    const reordered = [cast()[1]!, cast()[0]!] // [Standby, Regular]
    const draggableStub = wrapper.findComponent({ name: 'draggable' })
    await draggableStub.vm.$emit('update:modelValue', reordered)

    // Parent round-trip: same content, but a brand-new array reference
    // (e.g. deep-cloned), not the exact `reordered` object itself.
    await wrapper.setProps({ cast: JSON.parse(JSON.stringify(reordered)) as CastMember[] })

    const rowTexts = wrapper.findAll('small').map((row) => row.text())
    expect(rowTexts[0]).toContain('Standby')
    expect(rowTexts[1]).toContain('Regular')
  })
})
