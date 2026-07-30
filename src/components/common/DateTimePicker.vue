<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FlatPickr from 'vue-flatpickr-component'
import 'flatpickr/dist/flatpickr.css'
import { German } from 'flatpickr/dist/l10n/de.js'
import { formatDateTimeWithWeekday, parseWallClock, toWallClockString } from '@/services/dateFormat'

// 1:1 port of Legacy's Form/DatetimePickerComponent.vue (Flatpickr, 15-min
// steps, German locale, minimum date = tomorrow). Model contract: a naive
// wall-clock string (see dateFormat.ts) -- exactly the wire format the
// backend's `schedule` fields use, so callers never have to think about
// timezones themselves. Internally this component uses a Date object purely
// as a wall-clock/component container (never a real UTC instant), since
// that's what a human picks and what Flatpickr itself operates in.
const model = defineModel<string>({ required: true })

const minDate = new Date()
minDate.setDate(minDate.getDate() + 1)
minDate.setHours(0, 0, 0, 0)

const localDate = ref<Date>(parseWallClock(model.value))

watch(localDate, (value) => {
  model.value = toWallClockString(value)
})

watch(model, (value) => {
  const converted = parseWallClock(value)
  if (converted.getTime() !== localDate.value.getTime()) {
    localDate.value = converted
  }
})

const isEditable = computed(() => localDate.value.getTime() > minDate.getTime())

const config = {
  altInput: true,
  altFormat: 'D, j. F Y, H:i',
  dateFormat: 'Y-m-d H:i:S',
  minDate,
  enableTime: true,
  minuteIncrement: 15,
  locale: German,
}
</script>

<template>
  <FlatPickr v-if="isEditable" v-model="localDate" class="form-control" :config="config" />
  <div
    v-else
    class="fw-lighter text-black-50 fst-italic border-muted border rounded pt-1 pb-2 px-3 text-nowrap overflow-hidden"
    title="bereits vergangen"
  >
    {{ formatDateTimeWithWeekday(model) }}
  </div>
</template>
