import { defineComponent, h, reactive, type PropType } from 'vue'
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

// Mounts SingleCastList behind a thin REACTIVE host that mirrors
// CastView's own handleCastChanged pattern (`section[index] = {...,
// cast}` -- a real reactive mutation, round-tripped back down as a real
// prop, through Vue's real scheduler) instead of a test manually calling
// setProps() at a moment it controls. This is what actually exercises the
// watcher-ordering regression found via live testing (two watchers both
// reacting to the same `autoSort` change, one of them reactively
// mutating `cast` before the other's turn) -- a plain setProps()-driven
// test cannot reproduce that timing at all.
const ReactiveHost = defineComponent({
  props: {
    initialCast: { type: Array as PropType<CastMember[]>, required: true },
    required: { type: Number, required: true },
  },
  setup(props) {
    const state = reactive({ cast: [...props.initialCast] })
    return () =>
      h(SingleCastList, {
        cast: state.cast,
        required: props.required,
        notBooked: [],
        allowAutoSort: true,
        'onCast-changed': (next: CastMember[]) => {
          state.cast = next
        },
      })
  },
})

describe('SingleCastList', () => {
  it('marks entries within `required` as regular (green/bold), rest as standby (blue)', () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: false },
    })
    const rows = wrapper.findAll('small')
    expect(rows[0]?.classes()).toContain('text-success')
    expect(rows[1]?.classes()).toContain('text-info')
  })

  it('emits cast-changed with entries swapped on move up/down', async () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: false },
    })
    const downArrows = wrapper.findAll('.fa-arrow-down')
    await downArrows[0]?.trigger('click')
    expect(wrapper.emitted('cast-changed')?.[0]?.[0]).toEqual([
      { id: 2, name: 'Standby', fee: 80 },
      { id: 1, name: 'Regular', fee: 80 },
    ])
  })

  it('does not emit when moving beyond the boundary', async () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: false },
    })
    const upArrows = wrapper.findAll('.fa-arrow-up')
    await upArrows[0]?.trigger('click') // first entry, already at top
    expect(wrapper.emitted('cast-changed')).toBeUndefined()
  })

  it('emits cast-changed without the removed entry', async () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: false },
    })
    const removeIcons = wrapper.findAll('.fa-times')
    await removeIcons[0]?.trigger('click')
    expect(wrapper.emitted('cast-changed')?.[0]?.[0]).toEqual([{ id: 2, name: 'Standby', fee: 80 }])
  })

  it('renders its own "nicht gebucht" section when notBooked entries are passed', () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: notBooked(), allowAutoSort: false },
    })
    expect(wrapper.text()).toContain('nicht gebucht:')
    expect(wrapper.text()).toContain('REJECTED, Kandidat')
  })

  it('omits the "nicht gebucht" section entirely when there is nothing not booked', () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: false },
    })
    expect(wrapper.text()).not.toContain('nicht gebucht')
  })

  it('emits remove-not-booked with the entry id, not cast-changed', async () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: notBooked(), allowAutoSort: false },
    })
    const notBookedRemoveIcon = wrapper.findAll('.fa-times').at(-1)
    await notBookedRemoveIcon?.trigger('click')
    expect(wrapper.emitted('remove-not-booked')?.[0]).toEqual([3])
    expect(wrapper.emitted('cast-changed')).toBeUndefined()
  })

  it('renders a drag handle icon per cast row', () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: false },
    })
    expect(wrapper.findAll('.drag-handle')).toHaveLength(cast().length)
  })

  it('hides the drag handle and both arrows when only one person is booked -- nothing to reorder against', () => {
    const wrapper = mount(SingleCastList, {
      props: {
        cast: [{ id: 1, name: 'Solo', fee: 80 }],
        required: 1,
        notBooked: [],
        allowAutoSort: false,
      },
    })
    expect(wrapper.findAll('.drag-handle')).toHaveLength(0)
    expect(wrapper.findAll('.fa-arrow-up')).toHaveLength(0)
    expect(wrapper.findAll('.fa-arrow-down')).toHaveLength(0)
    expect(wrapper.findAll('.fa-times')).toHaveLength(1) // removing is still meaningful
  })

  it('passes mobile-friendly SortableJS options to the draggable wrapper', () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: false },
    })
    const draggableStub = wrapper.findComponent({ name: 'draggable' })
    expect(draggableStub.props()).toMatchObject({
      handle: '.drag-handle',
      delay: 200,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
    })
  })

  it('emits cast-changed with the array vuedraggable reports on a reorder', async () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: false },
    })
    const reordered = [cast()[1]!, cast()[0]!]
    const draggableStub = wrapper.findComponent({ name: 'draggable' })

    await draggableStub.vm.$emit('update:modelValue', reordered)

    expect(wrapper.emitted('cast-changed')?.[0]?.[0]).toEqual(reordered)
  })

  it('resyncs the rendered list when `cast` is replaced externally', async () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: false },
    })
    const newCast: CastMember[] = [{ id: 4, name: 'ADDED, Kandidat', fee: 90 }]

    await wrapper.setProps({ cast: newCast })

    expect(wrapper.text()).toContain('ADDED, Kandidat')
    expect(wrapper.text()).not.toContain('Regular')
  })

  it('does not reset the rendered order when the parent echoes back identical content via a new array reference', async () => {
    const wrapper = mount(SingleCastList, {
      props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: false },
    })
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

  describe('autom. Sortierung (choirjobs only)', () => {
    function voicedCast(): CastMember[] {
      return [
        { id: 1, name: 'ZIMMERMANN, Anna', fee: 35, voice_name: 'Alt', voice_order: 2 },
        { id: 2, name: 'ADLER, Bernd', fee: 35, voice_name: 'Sopran', voice_order: 1 },
        { id: 3, name: 'MUELLER, Clara', fee: 35, voice_name: 'Sopran', voice_order: 1 },
        { id: 4, name: 'ZIEGLER, Dora', fee: 35 }, // no voice assigned
        { id: 5, name: 'ABEL, Egon', fee: 35 }, // no voice assigned
      ]
    }

    it('does not render the switch when allowAutoSort is false', () => {
      const wrapper = mount(SingleCastList, {
        props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: false },
      })
      expect(wrapper.text()).not.toContain('autom. Sortierung')
    })

    it('renders the switch, defaulting to off (manual draggable list shown)', () => {
      const wrapper = mount(SingleCastList, {
        props: { cast: cast(), required: 1, notBooked: [], allowAutoSort: true },
      })
      expect(wrapper.text()).toContain('autom. Sortierung')
      expect(wrapper.findComponent({ name: 'draggable' }).exists()).toBe(true)
    })

    it('groups and sorts by Voice order then alphabetically within a group, "Stimmlage unbekannt" last', async () => {
      const wrapper = mount(SingleCastList, {
        props: { cast: voicedCast(), required: 5, notBooked: [], allowAutoSort: true },
      })

      await wrapper.find('input[role="switch"]').setValue(true)

      const headings = wrapper.findAll('small.fw-bold.text-muted').map((el) => el.text())
      expect(headings).toEqual(['Sopran', 'Alt', 'Stimmlage unbekannt'])
      // Within Sopran: ADLER before MUELLER (alphabetical); unknown group:
      // ABEL before ZIEGLER (alphabetical), placed after every voice group.
      const names = wrapper
        .findAll('small')
        .map((el) => el.text())
        .filter((text) => !headings.includes(text))
      expect(names[0]).toContain('ADLER, Bernd')
      expect(names[1]).toContain('MUELLER, Clara')
      expect(names[2]).toContain('ZIMMERMANN, Anna')
      expect(names[3]).toContain('ABEL, Egon')
      expect(names[4]).toContain('ZIEGLER, Dora')
    })

    it('hides the drag handle and up/down arrows, keeps the remove icon, when auto-sort is on', async () => {
      const wrapper = mount(SingleCastList, {
        props: { cast: voicedCast(), required: 5, notBooked: [], allowAutoSort: true },
      })

      await wrapper.find('input[role="switch"]').setValue(true)

      expect(wrapper.findAll('.drag-handle')).toHaveLength(0)
      expect(wrapper.findAll('.fa-arrow-up')).toHaveLength(0)
      expect(wrapper.findAll('.fa-arrow-down')).toHaveLength(0)
      expect(wrapper.findAll('.fa-times')).toHaveLength(voicedCast().length)
    })

    it('still removes a member via the ✕ icon in auto-sort mode', async () => {
      const wrapper = mount(SingleCastList, {
        props: { cast: voicedCast(), required: 5, notBooked: [], allowAutoSort: true },
      })
      await wrapper.find('input[role="switch"]').setValue(true)

      // First rendered row in sorted order is ADLER (Sopran, alphabetically first).
      await wrapper.findAll('.fa-times')[0]?.trigger('click')

      const emitted = wrapper.emitted('cast-changed')
      expect(emitted?.at(-1)?.[0]).not.toContainEqual(expect.objectContaining({ id: 2 }))
    })

    it('colors regular/standby by the GLOBAL sorted index, not a per-group index', async () => {
      // required=3 spans across the Sopran/Alt group boundary: ADLER(0),
      // MUELLER(1), ZIMMERMANN(2) are regular; the two unvoiced members
      // are standby -- regardless of their position within their own group.
      const wrapper = mount(SingleCastList, {
        props: { cast: voicedCast(), required: 3, notBooked: [], allowAutoSort: true },
      })
      await wrapper.find('input[role="switch"]').setValue(true)

      const rows = wrapper.findAll('small').filter((el) => el.text().includes('('))
      expect(rows[0]?.text()).toContain('ADLER')
      expect(rows[0]?.classes()).toContain('text-success')
      expect(rows[2]?.text()).toContain('ZIMMERMANN')
      expect(rows[2]?.classes()).toContain('text-success')
      expect(rows[3]?.text()).toContain('ABEL')
      expect(rows[3]?.classes()).toContain('text-info')
    })

    it('repositions a newly-added candidate into its correct voice group instead of appending it at the end', async () => {
      const wrapper = mount(SingleCastList, {
        props: { cast: voicedCast(), required: 5, notBooked: [], allowAutoSort: true },
      })
      await wrapper.find('input[role="switch"]').setValue(true)

      const newCandidate: CastMember = {
        id: 6,
        name: 'AAA, Neu',
        fee: 35,
        voice_name: 'Sopran',
        voice_order: 1,
      }
      await wrapper.setProps({ cast: [...voicedCast(), newCandidate] })

      const emitted = wrapper.emitted('cast-changed')
      const lastEmitted = emitted?.at(-1)?.[0] as CastMember[]
      const sopranNames = lastEmitted.filter((m) => m.voice_name === 'Sopran').map((m) => m.name)
      expect(sopranNames).toEqual(['AAA, Neu', 'ADLER, Bernd', 'MUELLER, Clara'])
    })

    it('does not re-emit cast-changed when the cast is already in sorted order', async () => {
      const alreadySorted = [...voicedCast()].sort((a, b) => {
        if ((a.voice_order ?? 99) !== (b.voice_order ?? 99)) {
          return (a.voice_order ?? 99) - (b.voice_order ?? 99)
        }
        return a.name.localeCompare(b.name)
      })
      const wrapper = mount(SingleCastList, {
        props: { cast: alreadySorted, required: 5, notBooked: [], allowAutoSort: true },
      })

      await wrapper.find('input[role="switch"]').setValue(true)

      expect(wrapper.emitted('cast-changed')).toBeUndefined()
    })

    it('restores the pre-auto-sort manual order when the switch is turned back off', async () => {
      const original = voicedCast()
      const wrapper = mount(SingleCastList, {
        props: { cast: original, required: 5, notBooked: [], allowAutoSort: true },
      })
      const switchInput = wrapper.find('input[role="switch"]')

      await switchInput.setValue(true)
      // Simulate the parent applying the auto-sort emit back down as a new
      // `cast` prop, exactly like CastItem/CastView do in production.
      const sorted = wrapper.emitted('cast-changed')?.at(-1)?.[0] as CastMember[]
      await wrapper.setProps({ cast: sorted })

      await switchInput.setValue(false)

      const restored = wrapper.emitted('cast-changed')?.at(-1)?.[0] as CastMember[]
      expect(restored.map((m) => m.id)).toEqual(original.map((m) => m.id))
    })

    it('restores the manual order through a REAL reactive round trip (regression: watcher-ordering bug, only reproducible with real Vue reactivity, not manual setProps)', async () => {
      // No voice assignments at all -- exactly the real-world scenario
      // that surfaced the bug live (every currently-booked choir member
      // lacks a structured Voice assignment today, see project memory on
      // the known data gap), so auto-sort collapses everything into one
      // "Stimmlage unbekannt" group, sorted purely alphabetically.
      const original: CastMember[] = [
        { id: 1, name: 'ZIMMERMANN, Anna', fee: 35 },
        { id: 2, name: 'ADLER, Bernd', fee: 35 },
        { id: 3, name: 'MUELLER, Clara', fee: 35 },
      ]
      const wrapper = mount(ReactiveHost, { props: { initialCast: original, required: 3 } })
      const switchInput = wrapper.find('input[role="switch"]')

      await switchInput.setValue(true)
      expect(wrapper.findAll('small').map((el) => el.text())).toEqual([
        'Stimmlage unbekannt',
        'ADLER, Bernd (35)',
        'MUELLER, Clara (35)',
        'ZIMMERMANN, Anna (35)',
      ])

      await switchInput.setValue(false)

      const names = wrapper.findAll('small').map((el) => el.text())
      expect(names).toEqual(['ZIMMERMANN, Anna (35)', 'ADLER, Bernd (35)', 'MUELLER, Clara (35)'])
    })

    it('keeps a member added while auto-sort was on, instead of discarding it on restore', async () => {
      const original = voicedCast()
      const wrapper = mount(SingleCastList, {
        props: { cast: original, required: 5, notBooked: [], allowAutoSort: true },
      })
      const switchInput = wrapper.find('input[role="switch"]')
      await switchInput.setValue(true)
      const sorted = wrapper.emitted('cast-changed')?.at(-1)?.[0] as CastMember[]
      const newMember: CastMember = {
        id: 6,
        name: 'NEU, Zusatz',
        fee: 35,
        voice_name: 'Sopran',
        voice_order: 1,
      }
      await wrapper.setProps({ cast: [...sorted, newMember] })
      const resorted = wrapper.emitted('cast-changed')?.at(-1)?.[0] as CastMember[]
      await wrapper.setProps({ cast: resorted })

      await switchInput.setValue(false)

      const restored = wrapper.emitted('cast-changed')?.at(-1)?.[0] as CastMember[]
      expect(restored.map((m) => m.id)).toEqual([...original.map((m) => m.id), 6])
    })

    it('drops a member removed while auto-sort was on, instead of resurrecting them on restore', async () => {
      const original = voicedCast()
      const wrapper = mount(SingleCastList, {
        props: { cast: original, required: 5, notBooked: [], allowAutoSort: true },
      })
      const switchInput = wrapper.find('input[role="switch"]')
      await switchInput.setValue(true)
      const sorted = wrapper.emitted('cast-changed')?.at(-1)?.[0] as CastMember[]
      await wrapper.setProps({ cast: sorted.filter((m) => m.id !== 2) })

      await switchInput.setValue(false)

      const restored = wrapper.emitted('cast-changed')?.at(-1)?.[0] as CastMember[]
      expect(restored.map((m) => m.id)).toEqual(original.filter((m) => m.id !== 2).map((m) => m.id))
    })
  })
})
