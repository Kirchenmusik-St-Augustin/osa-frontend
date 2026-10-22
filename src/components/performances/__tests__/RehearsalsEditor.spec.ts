import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RehearsalsEditor, { type RehearsalEntry } from '../RehearsalsEditor.vue'
import { toWallClockString } from '@/services/dateFormat'

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
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 45, 0, 0)
    expect(rehearsals[0]!.schedule).toBe(toWallClockString(tomorrow))
  })

  it('keeps the entries it was given when another one is appended', async () => {
    const existing: RehearsalEntry[] = [{ schedule: '2026-08-03T09:45:00', comment: 'GP' }]
    const wrapper = mount(RehearsalsEditor, {
      props: { modelValue: existing, 'onUpdate:modelValue': () => {} },
    })

    await wrapper.find('.fa-plus-circle').trigger('click')

    const emitted = wrapper.emitted('update:modelValue')![0]![0] as RehearsalEntry[]
    expect(emitted).toHaveLength(2)
    expect(emitted[0]).toEqual(existing[0])
  })

  it('emits a changed copy on comment and schedule edits, never mutating the given entries', async () => {
    const existing: RehearsalEntry[] = [
      { schedule: '2026-08-03T09:45:00', comment: 'GP' },
      { schedule: '2026-08-04T09:45:00', comment: 'Zweite' },
    ]
    const wrapper = mount(RehearsalsEditor, {
      props: { modelValue: existing, 'onUpdate:modelValue': () => {} },
    })

    await wrapper.findAll('input[aria-label="Kommentar zur Probe"]')[1]!.setValue('Neu')
    wrapper
      .findComponent({ name: 'DateTimePicker' })
      .vm.$emit('update:modelValue', '2026-09-01T10:00:00')
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:modelValue')!
    expect(emitted[0]![0]).toEqual([
      existing[0],
      { schedule: '2026-08-04T09:45:00', comment: 'Neu' },
    ])
    expect(emitted[1]![0]).toEqual([
      { schedule: '2026-09-01T10:00:00', comment: 'GP' },
      existing[1],
    ])
    expect(existing[1]!.comment).toBe('Zweite')
    expect(existing[0]!.schedule).toBe('2026-08-03T09:45:00')
  })

  it('applies a schedule edit to the row it was made in', () => {
    const existing: RehearsalEntry[] = [
      { schedule: '2026-08-03T09:45:00', comment: 'GP' },
      { schedule: '2026-08-04T09:45:00', comment: 'Zweite' },
    ]
    const wrapper = mount(RehearsalsEditor, {
      props: { modelValue: existing, 'onUpdate:modelValue': () => {} },
    })

    wrapper
      .findAllComponents({ name: 'DateTimePicker' })[1]!
      .vm.$emit('update:modelValue', '2026-09-02T11:00:00')

    expect(wrapper.emitted('update:modelValue')![0]![0]).toEqual([
      existing[0],
      { schedule: '2026-09-02T11:00:00', comment: 'Zweite' },
    ])
  })

  it('renders the add and remove controls as named buttons with hidden icons', () => {
    const wrapper = mount(RehearsalsEditor, {
      props: {
        modelValue: [{ schedule: '2026-08-03T09:45:00', comment: 'GP' }] as RehearsalEntry[],
        'onUpdate:modelValue': () => {},
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.map((button) => button.attributes('aria-label'))).toEqual([
      'Probe hinzufügen',
      'Probe entfernen',
    ])
    expect(buttons.map((button) => button.attributes('title'))).toEqual([
      'Probe hinzufügen',
      'entfernen',
    ])
    for (const button of buttons) {
      expect(button.attributes('type')).toBe('button')
      expect(button.find('i').attributes('aria-hidden')).toBe('true')
    }
  })

  it('shows an empty comment as an empty field', () => {
    const wrapper = mount(RehearsalsEditor, {
      props: {
        modelValue: [{ schedule: '2026-08-03T09:45:00', comment: null }] as RehearsalEntry[],
        'onUpdate:modelValue': () => {},
      },
    })

    const input = wrapper.find('input[aria-label="Kommentar zur Probe"]')
    expect((input.element as HTMLInputElement).value).toBe('')
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

  it('removes only the intended entry, not both, when two rehearsals share the same schedule and comment', async () => {
    const existing: RehearsalEntry[] = [
      { schedule: '2026-08-03T09:45:00', comment: '' },
      { schedule: '2026-08-03T09:45:00', comment: '' },
    ]
    const wrapper = mount(RehearsalsEditor, {
      props: { modelValue: existing, 'onUpdate:modelValue': () => {} },
    })

    await wrapper.findAll('.fa-trash')[0]!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')

    expect(emitted![0]![0]).toHaveLength(1)
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
