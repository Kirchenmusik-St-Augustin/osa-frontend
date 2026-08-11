import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreFieldsComponent from '../ScoreFieldsComponent.vue'
import type { ScoreFieldConfig, ScoreFieldsPayload } from '@/composables/useScores'

const PART_GROUPS = [
  'part1',
  'part2',
  'klausz1',
  'klausz2',
  'chorpart1',
  'chorpart2',
  'stsopr',
  'stalt',
  'stten',
  'stbass',
  'orgel',
]
// Only "orch" has no "anz" column at all -- 1:1 the real schema (an
// earlier reading wrongly assumed "orgel" lacked one too).
const NO_COUNT_GROUPS = ['orch']
const INSTRUMENTS = [
  'violine1',
  'violine2',
  'viola',
  'cello',
  'contrabass',
  'floete1',
  'floete2',
  'floete3',
  'oboe1',
  'oboe2',
  'klarinette1',
  'klarinette2',
  'fagott1',
  'fagott2',
  'kontrafagott',
  'trombalt',
  'trombten',
  'trombbass',
  'corno1',
  'corno2',
  'trompete1',
  'trompete2',
  'trompete3',
  'pauke',
]

function makeFieldsConfigAndData(): {
  fieldsConfig: Record<string, ScoreFieldConfig>
  fields: ScoreFieldsPayload
} {
  const fieldsConfig: Record<string, ScoreFieldConfig> = {}
  const fields: ScoreFieldsPayload = {}

  const text = (label: string | null, length: number): ScoreFieldConfig => ({
    label,
    kind: 'text',
    length,
    required: false,
    values: null,
  })
  const select = (values: string[]): ScoreFieldConfig => ({
    label: null,
    kind: 'select',
    length: null,
    required: false,
    values,
  })
  const number = (label: string | null): ScoreFieldConfig => ({
    label,
    kind: 'number',
    length: null,
    required: true,
    values: null,
  })

  fieldsConfig.werk = text('Werk', 75)
  fieldsConfig.teil = text('Werkteil', 55)
  fieldsConfig.sparte = select(['', 'Messe', 'Symphonie'])
  fieldsConfig.givenname = text('Vorname', 30)
  fieldsConfig.surname = text('Nachname', 30)
  fieldsConfig.geboren = number('Geboren')
  fieldsConfig.gestorben = number('Gestorben')
  fieldsConfig.verz = text('Werkeverzeichnis/Mappe', 32)
  fieldsConfig.jahr = number('Jahr')
  fieldsConfig.kasten = text('Kasten', 2)
  fieldsConfig.boxnr = text('Boxnummer', 16)
  fieldsConfig.auch = text('sieh auch Box/Mappe', 32)
  fieldsConfig.inhalt = select(['Partitur', 'Orchestermaterial'])
  fieldsConfig.zusatznoten = text('Zusatznoten', 256)
  fieldsConfig.bemerkung = text('Bemerkung', 256)
  for (const key of Object.keys(fieldsConfig)) {
    fields[key] = fieldsConfig[key]!.kind === 'number' ? 0 : ''
  }

  for (const group of [...PART_GROUPS, ...NO_COUNT_GROUPS]) {
    fieldsConfig[`${group}verl`] = text(null, 64)
    fieldsConfig[`${group}art`] = select(['', 'Original', 'Kopie', 'Original/Kopie'])
    fieldsConfig[`${group}zust`] = text(null, 8)
    fields[`${group}verl`] = ''
    fields[`${group}art`] = ''
    fields[`${group}zust`] = ''
    if (PART_GROUPS.includes(group)) {
      fieldsConfig[`${group}anz`] = number(null)
      fields[`${group}anz`] = 0
    }
  }

  for (const instrument of INSTRUMENTS) {
    fieldsConfig[instrument] = number(instrument)
    fields[instrument] = 0
  }

  for (let index = 1; index <= 4; index++) {
    fieldsConfig[`soinstr${index}art`] = text(`Name Sonderinstrument ${index}`, 32)
    fieldsConfig[`soinstr${index}anz`] = number(`Anzahl Sonderinstrument ${index}`)
    fields[`soinstr${index}art`] = ''
    fields[`soinstr${index}anz`] = 0
  }

  return { fieldsConfig, fields }
}

describe('ScoreFieldsComponent', () => {
  it('renders an input for every field in the registry', () => {
    const { fieldsConfig, fields } = makeFieldsConfigAndData()
    const wrapper = mount(ScoreFieldsComponent, {
      props: { modelValue: fields, fieldsConfig },
    })

    for (const name of Object.keys(fieldsConfig)) {
      expect(wrapper.find(`#score-field-${name}`).exists()).toBe(true)
    }
  })

  it('omits the "anz" column only for orch (orgel does have one)', () => {
    const { fieldsConfig, fields } = makeFieldsConfigAndData()
    const wrapper = mount(ScoreFieldsComponent, {
      props: { modelValue: fields, fieldsConfig },
    })

    expect(wrapper.find('#score-field-orgelanz').exists()).toBe(true)
    expect(wrapper.find('#score-field-orchanz').exists()).toBe(false)
  })

  it('still renders the verl/art/zust columns for orgel and orch', () => {
    const { fieldsConfig, fields } = makeFieldsConfigAndData()
    const wrapper = mount(ScoreFieldsComponent, {
      props: { modelValue: fields, fieldsConfig },
    })

    expect(wrapper.find('#score-field-orgelverl').exists()).toBe(true)
    expect(wrapper.find('#score-field-orchart').exists()).toBe(true)
  })

  it('renders the holdings row labels', () => {
    const { fieldsConfig, fields } = makeFieldsConfigAndData()
    const wrapper = mount(ScoreFieldsComponent, {
      props: { modelValue: fields, fieldsConfig },
    })

    expect(wrapper.text()).toContain('Partitur 1')
    expect(wrapper.text()).toContain('Orgel-Stimme')
    expect(wrapper.text()).toContain('Orchester')
  })

  it('updates the bound field object in place when a field changes', async () => {
    // The model is one shared reactive object mutated at nested paths
    // (v-model="model.werk" per field, 1:1 Legacy's own pattern) -- this
    // never fires ScoreFieldsComponent's OWN top-level update:modelValue
    // event; it mutates the object `fields` already references, which is
    // what actually keeps the parent view in sync.
    const { fieldsConfig, fields } = makeFieldsConfigAndData()
    const wrapper = mount(ScoreFieldsComponent, {
      props: { modelValue: fields, fieldsConfig },
    })

    await wrapper.find('#score-field-werk').setValue('Requiem')

    expect(fields.werk).toBe('Requiem')
  })

  it('forwards field errors to the matching input', () => {
    const { fieldsConfig, fields } = makeFieldsConfigAndData()
    const wrapper = mount(ScoreFieldsComponent, {
      props: {
        modelValue: fields,
        fieldsConfig,
        errors: { werk: 'Name, Komponist und Werkteil müssen zusammen eindeutig sein' },
      },
    })

    expect(wrapper.text()).toContain('Name, Komponist und Werkteil müssen zusammen eindeutig sein')
  })

  it('marks every field readonly when readonly is set', () => {
    const { fieldsConfig, fields } = makeFieldsConfigAndData()
    const wrapper = mount(ScoreFieldsComponent, {
      props: { modelValue: fields, fieldsConfig, readonly: true },
    })

    expect(wrapper.find('#score-field-werk').attributes('disabled')).toBeDefined()
  })
})
