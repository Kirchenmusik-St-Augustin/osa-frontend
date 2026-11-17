# Architecture Decisions

## ADR-1: Runtime dependencies without upstream maintenance

**Status:** accepted, 2026-10-22; amended 2026-11-17 (`flatpickr` replaced)

`flatpickr` 4.6.13 (last registry change 2022-06-18) and `vuedraggable` 4.1.0
(the `next` line for Vue 3; its `latest` tag is the Vue 2 line, last changed
2023-08-20) are no longer maintained. The package manager's advisory check
reports nothing for either today. They are third-party code in two places
that matter: the date inputs and the drag-and-drop ordering of the cast lists.
A vulnerability in either would get no upstream fix.

**Decision (2026-10-22):** both stay for now. No dependency change.

**Amendment (2026-11-17):** `flatpickr` and `vue-flatpickr-component` are
removed. `src/components/common/DateTimePicker.vue` is now an own calendar
popup behind the same `v-model` contract (a naive wall-clock string), so no
caller changed. The month arithmetic lives in `src/services/calendarGrid.ts`,
the selection rules in `src/composables/useDateTimePicker.ts`. Behaviour is
kept: German labels, Monday-first weeks, month and year navigation, the
earliest selectable day is tomorrow, a date that is no longer selectable is
shown read-only. The time is picked from selects (24 hours, 15-minute steps)
on every device, because the phone's own time wheel ignores the 15-minute
grid. `vuedraggable` stays: dragging the cast order is required behaviour.

**Where `vuedraggable` is used**

- `vuedraggable` (SortableJS underneath): only
  `src/components/bookings/SingleCastList.vue`, where the move buttons remain
  the keyboard path.

**Replacement plan for `vuedraggable`**

- Use `sortablejs` directly in `SingleCastList.vue` (it is already the engine
  below) or a maintained fork.

**Revisit when**

- an advisory is published for `vuedraggable` or for SortableJS,
- the Vue major version changes,
- the advisory check or the dependency update proposals flag the package.
