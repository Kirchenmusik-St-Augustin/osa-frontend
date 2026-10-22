# Architecture Decisions

## ADR-1: Two runtime dependencies without upstream maintenance

**Status:** accepted, 2026-10-22

`flatpickr` 4.6.13 (last registry change 2022-06-18) and `vuedraggable` 4.1.0
(the `next` line for Vue 3; its `latest` tag is the Vue 2 line, last changed
2023-08-20) are no longer maintained. The package manager's advisory check
reports nothing for either today. They are third-party code in two places that matter: the date
inputs and the drag-and-drop ordering of the cast lists. A vulnerability in
either would get no upstream fix.

**Decision:** both stay for now. No dependency change.

**Where they are used**

- `flatpickr` (through `vue-flatpickr-component`): only
  `src/components/common/DateTimePicker.vue`. The calendar is also used on
  phones (`disableMobile`), because the browser's own date field ignores the
  15-minute steps.
- `vuedraggable` (SortableJS underneath): only
  `src/components/bookings/SingleCastList.vue`, where the move buttons remain
  the keyboard path.

**Replacement plan**

- `flatpickr`: replace `DateTimePicker.vue` behind its current props and
  events, so the callers do not change. Candidate: the browser's
  `<input type="datetime-local">`, which needs its own handling of the
  15-minute grid and the minimum time, or a maintained calendar component.
- `vuedraggable`: use `sortablejs` directly in `SingleCastList.vue` (it is
  already the engine below) or a maintained fork.

**Revisit when**

- an advisory is published for either package or for SortableJS,
- the Vue major version changes,
- the advisory check or the dependency update proposals flag either package.
