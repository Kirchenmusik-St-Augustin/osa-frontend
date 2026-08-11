<script setup lang="ts">
// 1:1 port of Legacy's Scores/ScoreFieldsComponent.vue -- the fixed,
// manually laid-out grid for all 94 Score fields. Deliberately NOT a
// generic loop over every field (Legacy's own grid isn't uniform either:
// field groupings/column widths vary section to section).
import ScoreFieldsFieldComponent from './ScoreFieldsFieldComponent.vue'
import type { ScoreFieldConfig } from '@/composables/useScores'

const model = defineModel<Record<string, string | number>>({ required: true })

const props = withDefaults(
  defineProps<{
    fieldsConfig: Record<string, ScoreFieldConfig>
    readonly?: boolean
    errors?: Record<string, string>
  }>(),
  {
    readonly: false,
    errors: () => ({}),
  },
)

// Holdings section: row label + field-key prefix. Only "orch" has no
// "*anz" column at all (checked per-row below via hasAnzField, 1:1 the
// real schema -- "orgel" does have one).
const PART_GROUPS: { name: string; label: string }[] = [
  { name: 'part1', label: 'Partitur 1' },
  { name: 'part2', label: 'Partitur 2' },
  { name: 'klausz1', label: 'Klavierauszug 1' },
  { name: 'klausz2', label: 'Klavierauszug 2' },
  { name: 'chorpart1', label: 'Chorpartitur 1' },
  { name: 'chorpart2', label: 'Chorpartitur 2' },
  { name: 'stsopr', label: 'Sopran-Stimmen' },
  { name: 'stalt', label: 'Alt-Stimmen' },
  { name: 'stten', label: 'Tenor-Stimmen' },
  { name: 'stbass', label: 'Bass-Stimmen' },
  { name: 'orgel', label: 'Orgel-Stimme' },
  { name: 'orch', label: 'Orchester' },
]

// Instrumentation grid: 6 rows x 4 columns, field-KEY order only --
// Legacy's own local label map for this section (`instruments` in its
// ScoreFieldsComponent.vue) is dead code, never actually passed to its
// field renderer (which reads `fieldsConfig[name].label` via `with-title`
// instead) -- only the grouping/order below is real. Kept as the exact
// same odd (non-alphabetical) grouping so the physical layout matches.
const INSTRUMENT_GRID: string[][] = [
  ['violine1', 'trompete1', 'trombten', 'klarinette2'],
  ['violine2', 'trompete2', 'trombbass', 'oboe1'],
  ['viola', 'trompete3', 'floete1', 'oboe2'],
  ['cello', 'corno1', 'floete2', 'fagott1'],
  ['contrabass', 'corno2', 'floete3', 'fagott2'],
  ['pauke', 'trombalt', 'klarinette1', 'kontrafagott'],
]

function hasAnzField(name: string): boolean {
  return `${name}anz` in props.fieldsConfig
}
</script>

<template>
  <div class="card text-bg-light mb-3">
    <div class="card-body">
      <div class="row">
        <div class="col-lg-5">
          <ScoreFieldsFieldComponent
            v-model="model['werk']!"
            name="werk"
            with-title
            :config="fieldsConfig['werk']"
            :readonly="readonly"
            :error="errors['werk']"
          />
        </div>
        <div class="col-lg-5">
          <ScoreFieldsFieldComponent
            v-model="model['teil']!"
            name="teil"
            with-title
            :config="fieldsConfig['teil']"
            :readonly="readonly"
            :error="errors['teil']"
          />
        </div>
        <div class="col-lg-2">
          <ScoreFieldsFieldComponent
            v-model="model['sparte']!"
            name="sparte"
            with-title
            :config="fieldsConfig['sparte']"
            :readonly="readonly"
            :error="errors['sparte']"
          />
        </div>
      </div>
      <div class="row">
        <div class="col-lg-2">
          <ScoreFieldsFieldComponent
            v-model="model['givenname']!"
            name="givenname"
            with-title
            :config="fieldsConfig['givenname']"
            :readonly="readonly"
            :error="errors['givenname']"
          />
        </div>
        <div class="col-lg-2">
          <ScoreFieldsFieldComponent
            v-model="model['surname']!"
            name="surname"
            with-title
            :config="fieldsConfig['surname']"
            :readonly="readonly"
            :error="errors['surname']"
          />
        </div>
        <div class="col-lg-2">
          <ScoreFieldsFieldComponent
            v-model="model['geboren']!"
            name="geboren"
            with-title
            :config="fieldsConfig['geboren']"
            :readonly="readonly"
            :error="errors['geboren']"
          />
        </div>
        <div class="col-lg-2">
          <ScoreFieldsFieldComponent
            v-model="model['gestorben']!"
            name="gestorben"
            with-title
            :config="fieldsConfig['gestorben']"
            :readonly="readonly"
            :error="errors['gestorben']"
          />
        </div>
        <div class="col-lg-2">
          <ScoreFieldsFieldComponent
            v-model="model['verz']!"
            name="verz"
            with-title
            :config="fieldsConfig['verz']"
            :readonly="readonly"
            :error="errors['verz']"
          />
        </div>
        <div class="col-lg-2">
          <ScoreFieldsFieldComponent
            v-model="model['jahr']!"
            name="jahr"
            with-title
            :config="fieldsConfig['jahr']"
            :readonly="readonly"
            :error="errors['jahr']"
          />
        </div>
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col-sm-1">
      <ScoreFieldsFieldComponent
        v-model="model['kasten']!"
        name="kasten"
        with-title
        :config="fieldsConfig['kasten']"
        :readonly="readonly"
        :error="errors['kasten']"
      />
    </div>
    <div class="col-sm-2">
      <ScoreFieldsFieldComponent
        v-model="model['boxnr']!"
        name="boxnr"
        with-title
        :config="fieldsConfig['boxnr']"
        :readonly="readonly"
        :error="errors['boxnr']"
      />
    </div>
    <div class="col-sm-5">
      <ScoreFieldsFieldComponent
        v-model="model['auch']!"
        name="auch"
        with-title
        :config="fieldsConfig['auch']"
        :readonly="readonly"
        :error="errors['auch']"
      />
    </div>
    <div class="col-sm-4">
      <ScoreFieldsFieldComponent
        v-model="model['inhalt']!"
        name="inhalt"
        with-title
        :config="fieldsConfig['inhalt']"
        :readonly="readonly"
        :error="errors['inhalt']"
      />
    </div>
  </div>

  <div class="row mb-3">
    <div class="col-sm-2"><small>&nbsp;</small></div>
    <div class="col-sm-5"><small>Verlag</small></div>
    <div class="col-sm-2"><small>Art</small></div>
    <div class="col-sm-2"><small>Zustand</small></div>
    <div class="col-sm-1"><small>Anzahl</small></div>
  </div>
  <div v-for="group in PART_GROUPS" :key="group.name">
    <div class="row" :class="group.name === 'orgel' || group.name === 'orch' ? 'mt-4' : ''">
      <div class="col-sm-2">
        <small>{{ group.label }}</small>
      </div>
      <div class="col-sm-5">
        <ScoreFieldsFieldComponent
          v-model="model[`${group.name}verl`]!"
          :name="`${group.name}verl`"
          :config="fieldsConfig[`${group.name}verl`]"
          :readonly="readonly"
          :error="errors[`${group.name}verl`]"
          small
        />
      </div>
      <div class="col-sm-2">
        <ScoreFieldsFieldComponent
          v-model="model[`${group.name}art`]!"
          :name="`${group.name}art`"
          :config="fieldsConfig[`${group.name}art`]"
          :readonly="readonly"
          :error="errors[`${group.name}art`]"
          small
        />
      </div>
      <div class="col-sm-2">
        <ScoreFieldsFieldComponent
          v-model="model[`${group.name}zust`]!"
          :name="`${group.name}zust`"
          :config="fieldsConfig[`${group.name}zust`]"
          :readonly="readonly"
          :error="errors[`${group.name}zust`]"
          small
        />
      </div>
      <div class="col-sm-1">
        <ScoreFieldsFieldComponent
          v-if="hasAnzField(group.name)"
          v-model="model[`${group.name}anz`]!"
          :name="`${group.name}anz`"
          :config="fieldsConfig[`${group.name}anz`]"
          :readonly="readonly"
          :error="errors[`${group.name}anz`]"
          small
        />
      </div>
    </div>
  </div>

  <div class="row mt-3">
    <div class="col-sm-2"><span>&nbsp;</span></div>
    <div class="col-sm-10">
      <div v-for="(row, rowIndex) in INSTRUMENT_GRID" :key="rowIndex" class="row">
        <div v-for="fieldName in row" :key="fieldName" class="col-md-3">
          <ScoreFieldsFieldComponent
            v-model="model[fieldName]!"
            :name="fieldName"
            with-title
            :config="fieldsConfig[fieldName]"
            :readonly="readonly"
            :error="errors[fieldName]"
            title-small
            small
          />
        </div>
      </div>
      <hr />
      <div class="row mb-2">
        <div v-for="index in 4" :key="index" class="col-md-3">
          <ScoreFieldsFieldComponent
            v-model="model[`soinstr${index}art`]!"
            :name="`soinstr${index}art`"
            with-title
            :config="fieldsConfig[`soinstr${index}art`]"
            :readonly="readonly"
            :error="errors[`soinstr${index}art`]"
            title-small
            small
          />
          <ScoreFieldsFieldComponent
            v-model="model[`soinstr${index}anz`]!"
            :name="`soinstr${index}anz`"
            with-title
            :config="fieldsConfig[`soinstr${index}anz`]"
            :readonly="readonly"
            :error="errors[`soinstr${index}anz`]"
            title-small
            small
          />
        </div>
      </div>
    </div>
    <hr />
    <div class="row">
      <div class="col-sm-6">
        <ScoreFieldsFieldComponent
          v-model="model['zusatznoten']!"
          name="zusatznoten"
          with-title
          :config="fieldsConfig['zusatznoten']"
          :readonly="readonly"
          :error="errors['zusatznoten']"
        />
      </div>
      <div class="col-sm-6">
        <ScoreFieldsFieldComponent
          v-model="model['bemerkung']!"
          name="bemerkung"
          with-title
          :config="fieldsConfig['bemerkung']"
          :readonly="readonly"
          :error="errors['bemerkung']"
        />
      </div>
    </div>
  </div>
</template>
