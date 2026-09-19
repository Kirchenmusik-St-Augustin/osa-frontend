import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreDataComponent from '../ScoreDataComponent.vue'

describe('ScoreDataComponent', () => {
  it('renders id, created_at, and updated_at', () => {
    const wrapper = mount(ScoreDataComponent, {
      props: {
        score: {
          id: 42,
          created_at: '2026-01-01T10:00:00+00:00',
          updated_at: '2026-01-02T10:00:00+00:00',
        },
      },
    })

    expect(wrapper.text()).toContain('Eintrags-ID: 42')
    expect(wrapper.text()).toMatch(/Erstelldatum:.*2026/)
  })

  it('labels the updated_at row as "Änderungsdatum"', () => {
    const wrapper = mount(ScoreDataComponent, {
      props: {
        score: {
          id: 1,
          created_at: '2026-01-01T10:00:00+00:00',
          updated_at: '2026-01-02T10:00:00+00:00',
        },
      },
    })

    expect(wrapper.text()).toMatch(/Änderungsdatum:.*2026/)
  })

  it('renders nothing when there is no score', () => {
    const wrapper = mount(ScoreDataComponent, { props: { score: null } })

    expect(wrapper.text()).toBe('')
  })
})
