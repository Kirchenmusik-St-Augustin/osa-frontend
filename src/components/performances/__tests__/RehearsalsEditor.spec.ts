import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RehearsalsEditor, { type RehearsalEntry } from '../RehearsalsEditor.vue'

describe('RehearsalsEditor', () => {
  it('adds a rehearsal defaulting to tomorrow 09:45 with an empty comment', async () => {
    const wrapper = mount(RehearsalsEditor, {
      props: { modelValue: [] as RehearsalEntry[], 'onUpdate:modelValue': () => {} },
    })

    await wrapper.find('.fa-plus-circle').trigger('click')
    const emitted = wrapper.emitted('update:modelValue')

    expect(emitted).toHaveLength(1)
    const rehearsals = emitted![0]![0] as RehearsalEntry[]
    expect(rehearsals).toHaveLength(1)
    expect(rehearsals[0]!.comment).toBe('')
    expect(rehearsals[0]!.schedule.endsWith('09:45:00')).toBe(true)
  })

  it('removes a rehearsal by index', async () => {
    const existing: RehearsalEntry[] = [
      { schedule: '2026-08-03T09:45:00', comment: 'GP' },
      { schedule: '2026-08-04T09:45:00', comment: 'Zweite' },
    ]
    const wrapper = mount(RehearsalsEditor, {
      props: { modelValue: existing, 'onUpdate:modelValue': () => {} },
    })

    await wrapper.findAll('.fa-trash')[0]!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')

    expect(emitted![0]![0]).toEqual([existing[1]])
  })

  it('renders one row per rehearsal with a comment input', () => {
    const existing: RehearsalEntry[] = [{ schedule: '2026-08-03T09:45:00', comment: 'GP' }]
    const wrapper = mount(RehearsalsEditor, {
      props: { modelValue: existing, 'onUpdate:modelValue': () => {} },
    })

    // DateTimePicker's Flatpickr instance renders a hidden input (class
    // "flatpickr-input") plus a visible alt-input (class "form-control
    // input") -- restricting to type="text" without the "input" class
    // isolates this component's own comment field from both.
    const commentInputs = wrapper.findAll('input[type="text"].form-control:not(.input)')
    expect(commentInputs).toHaveLength(1)
    expect((commentInputs[0]!.element as HTMLInputElement).value).toBe('GP')
  })
})
