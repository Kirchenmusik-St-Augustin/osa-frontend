<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useClickOutside } from '@/composables/useClickOutside'
import { useDateTimePicker } from '@/composables/useDateTimePicker'
import { WEEKDAYS_MONDAY_FIRST, type CalendarCell } from '@/services/calendarGrid'
import {
  formatDateTimeWithWeekday,
  formatDayMonthYear,
  parseWallClock,
} from '@/services/dateFormat'

// Date-time picker (calendar popup, 15-minute steps, German labels, minimum
// date = tomorrow). Model contract: a naive wall-clock string (see
// dateFormat.ts) -- exactly the wire format the backend's `schedule` fields
// use, so callers never have to think about timezones themselves. A date
// that is no longer selectable (today or earlier) is shown read-only.
//
// The time is picked from selects on every device, never from the phone's
// own time wheel: that one ignores the 15-minute grid, so a time like 10:07
// could be entered on exactly the devices this app is mostly used on.
const model = defineModel<string>({ required: true })

const minDate = new Date()
minDate.setDate(minDate.getDate() + 1)
minDate.setHours(0, 0, 0, 0)

const {
  viewYear,
  viewMonth,
  grid,
  monthChoices,
  minYear,
  canGoPrevious,
  hourOptions,
  minuteOptions,
  hour,
  minute,
  isDayDisabled,
  isSelected,
  selectDay,
  showMonth,
  shiftMonth,
  setViewYear,
} = useDateTimePicker(model, minDate)

const isOpen = ref(false)
const rootElement = useTemplateRef<HTMLElement>('rootElement')

useClickOutside(rootElement, () => {
  isOpen.value = false
})

const isEditable = computed(() => parseWallClock(model.value).getTime() > minDate.getTime())
const label = computed(() => formatDateTimeWithWeekday(model.value))

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

function dayLabel(cell: CalendarCell): string {
  return formatDayMonthYear(cell.year, cell.month, cell.day)
}

function toggle(): void {
  isOpen.value = !isOpen.value
}

function close(): void {
  isOpen.value = false
}

// Months before the minimum are disabled options and cannot be chosen.
function onMonthChange(event: Event): void {
  showMonth(viewYear.value, Number((event.target as HTMLSelectElement).value))
}

// A rejected entry (a year before the minimum, text instead of a number)
// leaves the shown year unchanged, so the field is written back to what is
// actually displayed.
function onYearChange(event: Event): void {
  const input = event.target as HTMLInputElement
  setViewYear(input.valueAsNumber)
  input.value = String(viewYear.value)
}
</script>

<template>
  <div v-if="isEditable" ref="rootElement" class="date-time-picker" @keydown.esc="close">
    <input
      type="text"
      class="form-control picker-input"
      readonly
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :value="label"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    />

    <div v-if="isOpen" class="picker-panel" role="dialog" aria-label="Datum und Uhrzeit auswählen">
      <div class="picker-header">
        <button
          type="button"
          class="btn btn-sm btn-link"
          title="Vormonat"
          aria-label="Vormonat"
          :disabled="!canGoPrevious"
          @click="shiftMonth(-1)"
        >
          <i class="fas fa-chevron-left" aria-hidden="true"></i>
        </button>
        <select
          class="form-select form-select-sm"
          aria-label="Monat"
          :value="viewMonth"
          @change="onMonthChange"
        >
          <option
            v-for="choice in monthChoices"
            :key="choice.value"
            :value="choice.value"
            :disabled="choice.disabled"
          >
            {{ choice.label }}
          </option>
        </select>
        <input
          type="number"
          class="form-control form-control-sm picker-year"
          aria-label="Jahr"
          :min="minYear"
          :value="viewYear"
          @change="onYearChange"
        />
        <button
          type="button"
          class="btn btn-sm btn-link"
          title="Folgemonat"
          aria-label="Folgemonat"
          @click="shiftMonth(1)"
        >
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>

      <div class="picker-grid">
        <span v-for="weekday in WEEKDAYS_MONDAY_FIRST" :key="weekday" class="picker-weekday">
          {{ weekday }}
        </span>
        <button
          v-for="cell in grid"
          :key="`${cell.year}-${cell.month}-${cell.day}`"
          type="button"
          class="picker-day"
          :class="{ 'picker-day-outside': !cell.inMonth, 'picker-day-selected': isSelected(cell) }"
          :aria-label="dayLabel(cell)"
          :aria-pressed="isSelected(cell)"
          :disabled="isDayDisabled(cell)"
          @click="selectDay(cell)"
        >
          {{ cell.day }}
        </button>
      </div>

      <div class="picker-time">
        <select v-model.number="hour" class="form-select form-select-sm" aria-label="Stunde">
          <option v-for="option in hourOptions" :key="option" :value="option">
            {{ pad(option) }}
          </option>
        </select>
        <span aria-hidden="true">:</span>
        <select v-model.number="minute" class="form-select form-select-sm" aria-label="Minute">
          <option v-for="option in minuteOptions" :key="option" :value="option">
            {{ pad(option) }}
          </option>
        </select>
      </div>
    </div>
  </div>
  <div
    v-else
    class="fw-lighter text-black-50 fst-italic border-muted border rounded pt-1 pb-2 px-3 text-nowrap overflow-hidden"
    title="bereits vergangen"
  >
    {{ label }}
  </div>
</template>

<style scoped>
/* Mobile first: the popup spans the width of its field (up to 20rem) and the
   day cells are large enough for a finger; the compact desktop sizing only
   comes in progressively. */
.date-time-picker {
  position: relative;
}

.picker-input {
  cursor: pointer;
}

.picker-panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  width: 100%;
  max-width: 20rem;
  margin-top: 0.25rem;
  padding: 0.5rem;
  background-color: var(--bs-body-bg);
  border: var(--bs-border-width) solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  box-shadow: var(--bs-box-shadow);
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.picker-header .btn {
  padding-inline: 0.25rem;
}

/* The month name takes the width the arrows and the year leave over, so even
   "September" is not cut off on a phone. */
.picker-header .form-select {
  flex: 1 1 auto;
  min-width: 0;
  padding-right: 1.5rem;
  background-position: right 0.4rem center;
}

.picker-year {
  width: 4rem;
  flex: none;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.picker-weekday {
  text-align: center;
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
}

.picker-day {
  height: 2.5rem;
  padding: 0;
  border: 0;
  border-radius: var(--bs-border-radius);
  background-color: transparent;
  color: var(--bs-body-color);
}

.picker-day:hover:enabled {
  background-color: var(--bs-secondary-bg);
}

.picker-day-outside {
  color: var(--bs-secondary-color);
}

.picker-day-selected,
.picker-day-selected:hover:enabled {
  background-color: var(--bs-primary);
  color: var(--bs-white);
}

.picker-day:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.picker-time {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

@media (min-width: 768px) {
  .picker-day {
    height: 2rem;
  }
}
</style>
